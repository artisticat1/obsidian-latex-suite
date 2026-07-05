import { ParseContext } from "@codemirror/language";
import { ChangeSet, EditorState, StateEffect, StateField, Transaction } from "@codemirror/state";
import { EditorView, logException, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Parser, Tree } from "@lezer/common";
import { fullMathParser } from "./mathjax-parser";

export class Work {
	// Milliseconds of work time to perform immediately for a state doc change
	static Apply = 20;
	// Minimum amount of work time to perform in an idle callback
	static MinSlice = 25;
	// Amount of work time to perform in pseudo-thread when idle callbacks aren't supported
	static Slice = 100
	// Minimum pause between pseudo-thread slices
	static MinPause = 100
	// Maximum pause (timeout) for the pseudo-thread
	static MaxPause = 500;
	// Parse time budgets are assigned per chunk—the parser can run for
	// ChunkBudget milliseconds at most during ChunkTime milliseconds.
	// After that; no further background parsing is scheduled until the
	// next chunk in which the editor is active.
	static ChunkBudget = 3000;
	static ChunkTime = 30000;
	// For every change the editor receives while focused; it gets a
	// small bonus to its parsing budget (as a way to allow active
	// editors to continue doing work).
	static ChangeBonus = 50;
	// Don't eagerly parse this far beyond the end of the viewport
	static MaxParseAhead = 1e5;
	// When initializing the state field (before viewport info is
	// available); pretend the viewport goes from 0 to here.
	static InitViewport = 3000;
	private constructor() {}
}


interface ParserContext extends ParseContext {
	create?: (parser: Parser, state: EditorState, viewport: {from: number, to: number}) => ParserContext;
	work?: (until: number | (() => boolean), upto?: number) => boolean;
	takeTree?: () => void;
	tree: Tree;
	changes(changes: ChangeSet, state: EditorState): ParserContext;
	isDone?(docLen: number): boolean;
	treeLen?: number;
	scheduleOn?: Promise<void> | null;
	updateViewport?(viewport: {from: number, to: number}): boolean;
}
const TypedParseContext = ParseContext as unknown as ParserContext;

class LanguageState {
	// The current tree. Immutable, because directly accessible from
	// the editor state.
	tree: Tree;
	context: ParserContext;

	constructor(
		// A mutable parse state that is used to preserve work done during
		// the lifetime of a state when moving to the next state.
		context: ParseContext,
	) {
		const context2 = context as unknown as ParserContext;
		this.tree = context2.tree;
		this.context = context2;
	}

	apply(tr: Transaction) {
		if (!tr.docChanged && this.tree == this.context.tree) return this;
		let newCx = this.context.changes(tr.changes, tr.state);
		// If the previous parse wasn't done, go forward only up to its
		// end position or the end of the viewport, to avoid slowing down
		// state updates with parse work beyond the viewport.
		let upto =
			this.context.treeLen == tr.startState.doc.length
				? undefined
				: Math.max(
						tr.changes.mapPos(this.context.treeLen!),
						newCx.viewport.to,
					);
		if (!newCx.work(Work.Apply, upto)) newCx.takeTree();
		return new LanguageState(newCx);
	}

	static init(parser: Parser) {
		return (state: EditorState) => {
			const vpTo = Math.min(Work.InitViewport, state.doc.length);
			const parseState = TypedParseContext.create?.(parser, state, {
				from: 0,
				to: vpTo,
			});
			if (!parseState) throw new Error("Failed to create parse state");
			const work = parseState.work?.(Work.Apply, vpTo);
			if (work === undefined) throw new Error("Failed to work on parse state");
			if (work) {
				parseState.takeTree?.();
			}
			return new LanguageState(parseState);
		};
	}
}
type FakeNavigator = {
	scheduling?: {
		isInputPending?: () => boolean;
	};
};
const isInputPending = typeof navigator != "undefined" && (navigator as unknown as FakeNavigator)?.scheduling?.isInputPending
  ? (): boolean => !!(navigator as unknown as FakeNavigator)?.scheduling?.isInputPending?.() : null

const LanguageSetStateEffect = StateEffect.define<LanguageState>();

const requestIdle = (callback: (deadline?: IdleDeadline) => void) => {
	let timeout = activeWindow.setTimeout(() => callback(), Work.MaxPause)
	return () => activeWindow.clearTimeout(timeout)
}
  
const parseWorker = ViewPlugin.fromClass(
	class ParseWorker {
		working: (() => void) | null = null;
		workScheduled = 0;
		// End of the current time chunk
		chunkEnd = -1;
		// Milliseconds of budget left for this chunk
		chunkBudget = -1;
		workCallback: (deadline: IdleDeadline) => void;

		constructor(readonly view: EditorView) {
			this.workCallback = (deadline: IdleDeadline) => this.work(deadline);
			this.scheduleWork();
		}

		update(update: ViewUpdate) {
			const cx = this.view.state.field(languageStateField).context;
			if (
				cx.updateViewport(update.view.viewport) ||
				this.view.viewport.to > cx.treeLen
			)
				this.scheduleWork();
			if (update.docChanged || update.selectionSet) {
				if (this.view.hasFocus) this.chunkBudget += Work.ChangeBonus;
				this.scheduleWork();
			}
			this.checkAsyncSchedule(cx);
		}

		scheduleWork() {
			if (this.working) return;
			let { state } = this.view,
				field = state.field(languageStateField);
			if (
				field.tree != field.context.tree ||
				!field.context.isDone(state.doc.length)
			)
				this.working = requestIdle(this.workCallback);
		}

		work(deadline?: IdleDeadline) {
			this.working = null;

			let now = Date.now();
			if (
				this.chunkEnd < now &&
				(this.chunkEnd < 0 || this.view.hasFocus)
			) {
				// Start a new chunk
				this.chunkEnd = now + Work.ChunkTime;
				this.chunkBudget = Work.ChunkBudget;
			}
			if (this.chunkBudget <= 0) return; // No more budget

			let {
					state,
					viewport: { to: vpTo },
				} = this.view,
				field = state.field(languageStateField);
			if (
				field.tree == field.context.tree &&
				field.context.isDone(vpTo + Work.MaxParseAhead)
			)
				return;
			let endTime =
				Date.now() +
				Math.min(
					this.chunkBudget,
					Work.Slice,
					deadline && !isInputPending
						? Math.max(Work.MinSlice, deadline.timeRemaining() - 5)
						: 1e9,
				);
			let viewportFirst =
				field.context.treeLen < vpTo && state.doc.length > vpTo + 1000;
			let done = field.context.work(
				() => {
					return (
						(isInputPending && isInputPending()) ||
						Date.now() > endTime
					);
				},
				vpTo + (viewportFirst ? 0 : Work.MaxParseAhead),
			);
			this.chunkBudget -= Date.now() - now;
			if (done || this.chunkBudget <= 0) {
				field.context.takeTree();
				const languageField = this.view.state.field(languageStateField)
				languageField.context = field.context;
				languageField.tree = field.tree
			}
			if (this.chunkBudget > 0 && !(done && !viewportFirst))
				this.scheduleWork();
			this.checkAsyncSchedule(field.context);
		}

		checkAsyncSchedule(cx: ParserContext) {
			if (cx.scheduleOn) {
				this.workScheduled++;
				void cx.scheduleOn
					.then(() => this.scheduleWork())
					.catch((err) => logException(this.view.state, err))
					.then(() => this.workScheduled--);
				cx.scheduleOn = null;
			}
		}

		destroy() {
			if (this.working) this.working();
		}

		isWorking() {
			return !!(this.working || this.workScheduled > 0);
		}
	},
	{
		eventHandlers: {
			focus() {
				this.scheduleWork();
			},
		},
	},
);

const create = LanguageState.init(fullMathParser);
const update = function languageUpdate(value: LanguageState, tr: Transaction) { 
	for (let e of tr.effects) if (e.is(LanguageSetStateEffect)) return e.value
	return value.apply(tr);
}
const languageStateField = StateField.define({
	// create: LanguageState.init(fullMathParser()),
	// update: (value, tr) => {
	// 	return value.apply(tr);
	// }
	create,update
})

export function modifiedSyntaxTree(state: EditorState) {
	return state.field(languageStateField).tree;
}

export const languageExtension = [languageStateField, parseWorker];
