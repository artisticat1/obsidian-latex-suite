// https://discuss.codemirror.net/t/concealing-syntax/3135

import { ViewUpdate, Decoration, type DecorationSet, WidgetType, ViewPlugin, EditorView, type PluginValue } from "@codemirror/view";
import { ChangeSet, EditorSelection, Range, RangeSet, RangeSetBuilder, RangeValue, StateEffect, Transaction } from "@codemirror/state";
import { conceal, type ConcealCachedEquations } from "./conceal_fns";
import { debounce, livePreviewState } from "src/editor_extensions/obsidian_utils";
import { isTempKeypressUpdate } from "src/snippets/snippet_management";
import { createElement } from "./obsidian_utils";
import { getConcealConfig, getConcealConfigExtension, getLatexSuiteConfig, type ConcealConfigInput } from "src/snippets/codemirror/config";

export type Replacement = {
	start: number,
	end: number,
	text: string,
	class?: string,
	elementType?: string,
	marks?: boolean,
	style?: string,
};

export type ConcealSpec = Replacement[];

/**
 * Make a ConcealSpec from the given list of Replacements.
 * This function essentially does nothing but improves readability.
 */
export function mkConcealSpec(...replacements: Replacement[]) {
	return replacements;
}

export type Concealment = {
	spec: ConcealSpec,
	cursorPosType: "within" | "apart" | "edge",
	enable: boolean,
};

// Represents how a concealment should be handled
// 'delay' means reveal after a time delay.
type ConcealAction = "conceal" | "reveal" | "delay";


class ConcealWidget extends WidgetType {
	private readonly className: string;
	private readonly elementType: string;

	constructor(readonly symbol: string, className?: string, elementType?: string) {
		super();

		this.className = className ? className : "";
		this.elementType = elementType ? elementType : "span";
	}

	eq(other: ConcealWidget) {
		return ((other.symbol == this.symbol) && (other.className === this.className) && (other.elementType === this.elementType));
	}

	toDOM() {
		const span = createElement(this.elementType);
		span.className = "cm-math " + this.className;
		span.textContent = this.symbol;
		return span;
	}

	ignoreEvent() {
		return false;
	}
}

class TextWidget extends WidgetType {

	constructor(readonly symbol: string) {
		super();
	}

	eq(other: TextWidget) {
		return (other.symbol == this.symbol);
	}

	toDOM() {
		const span = createElement("span");
		span.className = "cm-math";
		span.textContent = this.symbol;
		return span;
	}

	ignoreEvent() {
		return false;
	}
}

/**
 * Determine if the two ConcealSpec instances before and after the update can be
 * considered identical.
 */
function atSamePosAfter(
	changes: ChangeSet,
	oldConceals: ConcealSpec,
	newConceals: ConcealSpec,
): boolean {
	if (oldConceals.length !== newConceals.length) return false;

	for (let i = 0; i < oldConceals.length; ++i) {
		const oldConceal = oldConceals[i]!;
		const newConceal = newConceals[i]!;
		// Set associativity to ensure that insertions on either side of the
		// concealed region do not expand the region
		const oldStartUpdated = changes.mapPos(oldConceal.start, 1);
		const oldEndUpdated = changes.mapPos(oldConceal.end, -1);
		const b = oldStartUpdated == newConceal.start && oldEndUpdated == newConceal.end;
		if (!b) return false;
	}

	return true;
}

function determineCursorPosType(
    view: EditorView,
    concealSpec: ConcealSpec,
    linewise: boolean,
): Concealment["cursorPosType"] {
    // Priority: "within" > "edge" > "apart"

    const sel = view.state.selection;
    let cursorPosType: Concealment["cursorPosType"] = "apart";

    for (const range of sel.ranges) {
        const fromRange = linewise ? view.state.doc.lineAt(range.from) : range;
        const to = (
            linewise
                ? range.to <= fromRange.to
                    ? fromRange
                    : view.state.doc.lineAt(range.to)
                : range
        ).to;
        const from = fromRange.from;
        for (const replace of concealSpec) {
            // 'cursorPosType' is guaranteed to be "edge" or "apart" at this point
            const overlapRangeFrom = Math.max(from, replace.start);
            const overlapRangeTo = Math.min(to, replace.end);

            if (
                overlapRangeFrom === overlapRangeTo &&
                (overlapRangeFrom === replace.start ||
                    overlapRangeFrom === replace.end)
            ) {
                cursorPosType = "edge";
                continue;
            }

            if (overlapRangeFrom <= overlapRangeTo) return "within";
        }
    }

    return cursorPosType;
}

/*
* We determine how to handle a concealment based on its 'cursorPosType' before
* and after an update and current mousedown state.
*
* When the mouse is down, we enable all concealments to make selecting math
* expressions easier.
*
* When the mouse is up, we follow the table below.
* The row represents the previous 'cursorPosType' and the column represents the
* current 'cursorPosType'. Each cell contains the action to be taken.
*
*        |  apart  |  edge  | within
* -----------------------------------
* apart  | conceal | delay  | reveal
* edge   | conceal | delay  | reveal
* within | conceal | reveal | reveal
* N/A    | conceal | reveal | reveal
*
* 'N/A' means that the concealment do not exist before the update, which should
* be judged by 'atSamePosAfter' function.
*/
function determineAction(
	oldCursor: Concealment["cursorPosType"] | undefined,
	newCursor: Concealment["cursorPosType"],
	mousedown: boolean,
	delayEnabled: boolean,
): ConcealAction {
	if (mousedown) return "conceal";

	if (newCursor === "apart") return "conceal";
	if (newCursor === "within") return "reveal";

	// newCursor === "edge"
	if (!delayEnabled) return "reveal";
	// delay is enabled
	if (!oldCursor || oldCursor === "within") return "reveal";
	else return "delay";
}

// Build a decoration set from the given concealments
function buildDecoSet(concealments: Concealment[]) {
	const decos: Range<Decoration>[] = []
	const outerDecos: Range<Decoration>[] = []

	for (const conc of concealments) {
		if (!conc.enable) continue;

		for (const replace of conc.spec) {
			if (replace.start === replace.end) {
				// Add an additional "/" symbol, as part of concealing \\frac{}{} -> ()/()
				decos.push(
					Decoration.widget({
						widget: new TextWidget(replace.text),
						block: false,
					}).range(replace.start, replace.end)
				);
			} else if (replace.marks) {
				outerDecos.push(
					Decoration.mark({
						class: replace.class ?? "",
						inclusiveEnd: true,
						attributes: {
							style: replace.style ?? "",
						},
					}).range(replace.start, replace.end),
				);
			} else {
				// Improve selecting empty replacements such as "\frac" -> ""
				// NOTE: This might not be necessary
				const inclusiveStart = replace.text === "";
				const inclusiveEnd = false;

				decos.push(
					Decoration.replace({
						widget: new ConcealWidget(
							replace.text,
							replace.class,
							replace.elementType,
						),
						inclusiveStart,
						inclusiveEnd,
						block: false,
					}).range(replace.start, replace.end)
				);
			}
		}
	}

	const decorations = Decoration.set(decos, true);
	const outerDecorations = Decoration.set(outerDecos, true);
	return { decorations, outerDecorations };
}

// Build atomic ranges from the given concealments.
// The resulting ranges are basically the same as the original replacements, but empty replacements
// are merged with the "next character," which can be either plain text or another replacement.
// This adjustment makes cursor movement around empty replacements more intuitive.
function buildAtomicRanges(concealments: Concealment[]) {
	const repls: Replacement[] = concealments
		.filter(c => c.enable)
		.flatMap(c => c.spec)
		.sort((a, b) => a.start - b.start);

	// RangeSet requires RangeValue but we do not need one
	const fakeval = new (class extends RangeValue {});
	const builder = new RangeSetBuilder();
	for (let i = 0; i < repls.length; i++) {
		const replace = repls[i]!;
		const nextReplace = repls[i + 1];
		if (replace.text === "") {
			if (nextReplace && replace.end == nextReplace.start && !nextReplace.marks) {
				builder.add(replace.start, nextReplace.end, fakeval);
				i++;
			} else {
				builder.add(replace.start, replace.end + 1, fakeval);
			}
		} else if (replace.marks) {
			if (nextReplace && nextReplace.text === "" && replace.end == nextReplace.start) {
				i++;
			}
		} else {
			builder.add(replace.start, replace.end, fakeval);
		}
	}
	return builder.finish();
}

export const createRevealCallback = (timeout: number) =>
	debounce(
		(
			conceal: Conceal,
			delayedConcealments: Concealment[],
			view: EditorView,
		) => {
			for (const concealment of delayedConcealments) {
				concealment.enable = false;
			}
			const buildResult = buildDecoSet(conceal.concealments);
			conceal.decorations = buildResult.decorations;
			conceal.outerDecorations = buildResult.outerDecorations;
			conceal.atomicRanges = buildAtomicRanges(conceal.concealments);
			// Invoke the update method to reflect the changes of this.decoration
			view.dispatch();
			//TODO: If replit or the future maintainers of vim ever decides to support CM6 (decorations) properly, remove this.
			//@ts-ignore
			view?.cm?.signal("vim-command-done");
		},
		timeout,
		true
	);

export const updateConcealEffect = StateEffect.define<null>();
function isUpdateConcealEffect(update: {
	transactions: readonly Transaction[];
}): boolean {
	return update.transactions.some((tr) =>
		tr.effects.some((e) => e.is(updateConcealEffect)),
	);
}

const updateSelection = debounce((view: EditorView) => {
	const ranges = view.state.selection.ranges.map(r => {
		return EditorSelection.range(r.from, r.to, r.assoc);
	});
	view.dispatch({
		selection: EditorSelection.create(ranges),
	});
}, 50);

type MinimalViewUpdate = {
	view: EditorView;
	changes: ViewUpdate["changes"];
	state: EditorView["state"];
	docChanged: boolean;
	viewportChanged: boolean;
	selectionSet: boolean;
	transactions: readonly Transaction[];
};

function* iterRangeSet<T extends RangeValue>(rangeSet: RangeSet<T>): Iterable<Range<T>> {
	let iter = rangeSet.iter();
	while (iter.value !== null) {
		yield {
			from: iter.from,
			to: iter.to,
			value: iter.value
		};
		iter.next()
	}
}

export class Conceal implements PluginValue {
	// Stateful ViewPlugin: you should avoid one in general, but here
	// the approach based on StateField and updateListener conflicts with
	// obsidian's internal logic and causes weird rendering.
	concealments: Concealment[];
	outerDecorations: DecorationSet;
	decorations: DecorationSet;
	atomicRanges: RangeSet<RangeValue>;
	delayEnabled: boolean;
	cached_equations: ConcealCachedEquations;
	concealSpecs: ConcealSpec[];
	mousedown: boolean = false;


	constructor(view: EditorView) {
		this.concealments = [];
		this.decorations = Decoration.none;
		this.outerDecorations = Decoration.none;
		this.atomicRanges = RangeSet.empty as RangeSet<RangeValue>;
		const revealTimeout = getLatexSuiteConfig(view).concealRevealTimeout;
		this.delayEnabled = revealTimeout > 0;
		this.cached_equations = {};
		this.concealSpecs = [];
		// HACK: trigger an initial concealment calculation
		const transactions: readonly Transaction[] = [];
		const changes: ChangeSet = ChangeSet.empty(view.state.doc.length);
		this.update({
			view,
			state: view.state,
			docChanged: true,
			viewportChanged: false,
			selectionSet: false,
			transactions,
			changes,
		});
		this.mousedown = view.plugin(livePreviewState)?.mousedown ?? false;
	}

	update(update: MinimalViewUpdate) {
		if (!(update.docChanged || update.viewportChanged || update.selectionSet) && !isUpdateConcealEffect(update))
			return;
		if (isTempKeypressUpdate(update)) {
			this.decorations = this.decorations.map(update.changes);
			this.atomicRanges = this.atomicRanges.map(update.changes);
			return;
		}
		const settings = getConcealConfig(update.view.state);
		const mappingInfo = settings.concealMaps;

		// Cancel the delayed revealment whenever we update the concealments
		settings.delayedReveal.cancel();
		// If document/viewport is not changed, the conceal specs stay the same 
		// and only the revealing needs to be updated.
		if (!update.docChanged && !update.viewportChanged) {
			this.updateFromConcealSpecs(this.concealSpecs, update);
		} else {
			const {specs: concealSpecs, cached_equations} = conceal(update.view, this.cached_equations, mappingInfo);
			this.cached_equations = cached_equations;
			this.concealSpecs = concealSpecs;
			this.updateFromConcealSpecs(concealSpecs, update);
		}
		if (settings.concealLogLevel === "verbose") {
			const atomicRanges = Array.from(iterRangeSet(this.atomicRanges));	
			const startState = (update as Partial<ViewUpdate>).startState?.toJSON() as unknown;
			const state = (update as Partial<ViewUpdate>).state?.toJSON() as unknown;
			console.debug("Conceal update:", {
				concealSpecs: this.concealSpecs,
				concealments: this.concealments,
				atomicRanges,
				changes: update.changes.toJSON() as unknown,
				startState,
				state
			});
		}
	}
	
	private updateFromConcealSpecs(concealSpecs: ConcealSpec[], update: MinimalViewUpdate) {
		const settings  = getConcealConfig(update.view.state);

		const previousMouseDown = this.mousedown
		this.mousedown = update.view.plugin(livePreviewState)?.mousedown ?? false;

		// Collect concealments from the new conceal specs
		const concealments: Concealment[] = [];
		// concealments that should be revealed after a delay (i.e. 'delay' action)
		const delayedConcealments: Concealment[] = [];
		let revealed = false

		for (const spec of concealSpecs) {
			const cursorPosType = determineCursorPosType(update.view, spec, settings.concealLinewise);
			const oldConcealment = this.concealments.find(
				(old) => atSamePosAfter(update.changes, old.spec, spec)
			);

			const concealAction = determineAction(
				oldConcealment?.cursorPosType, cursorPosType, this.mousedown, this.delayEnabled
			);
			revealed = revealed || concealAction === "reveal";

			const concealment: Concealment = {
				spec,
				cursorPosType,
				enable: concealAction !== "reveal",
			};

			if (concealAction === "delay") {
				delayedConcealments.push(concealment);
			}

			concealments.push(concealment);
		}
		// if it changes from mousedown to mouseup in livepreview, shuffle the selection to update the selection visually
		if (revealed && previousMouseDown && !this.mousedown && update.view.state.selection.ranges.some(r => !r.empty)) {
			updateSelection(update.view);	
		}		

		if (delayedConcealments.length > 0) {
			settings.delayedReveal(this, delayedConcealments, update.view);
		}

		this.concealments = concealments;
		const buildResult = buildDecoSet(this.concealments);
		this.decorations = buildResult.decorations;
		this.outerDecorations = buildResult.outerDecorations;
		this.atomicRanges = buildAtomicRanges(this.concealments);
	}
}
const concealTheme = EditorView.baseTheme({
	"span.cm-math.cm-concealed-bold": {
		fontWeight: "bold",
	},

	"span.cm-math.cm-concealed-underline": {
		textDecoration: "underline",
	},

	"span.cm-math.cm-concealed-mathrm, sub.cm-math.cm-concealed-mathrm": {
		fontStyle: "normal",
	},

	/* Conceal superscripts without changing line height */
	"sup.cm-math": {
		lineHeight: 0,
	},

	"sup.cm-math, sub.cm-math": {
		fontStyle: "italic",
	},

	"span.cm-concealed-text-color, span.cm-concealed-text-color *": {
		color: "inherit",
	},

	".latex-suite-overline": {
		paddingTop: 0,
		borderTop: "1px solid var(--text-normal)",
	},

	".latex-suite-overline.latex-suite-overline-1": {
		paddingTop: "0.15em",
		borderTop: "1px dashed var(--text-normal)",
	},

	".latex-suite-overline.latex-suite-overline-2": {
		paddingTop: "0.3em",
		borderTop: "1px dotted var(--text-normal)",
	},

	".latex-suite-underline": {
		paddingBottom: "0",
		borderBottom: "1px solid var(--text-normal)",
	},

	".latex-suite-underline.latex-suite-underline-1": {
		paddingBottom: "0.15em",
		borderBottom: "1px dashed var(--text-normal)",
	},

	".latex-suite-underline.latex-suite-underline-2": {
		paddingBottom: "0.3em",
		borderBottom: "1px dotted var(--text-normal)",
	},

});

const concealPlugin = ViewPlugin.fromClass(Conceal, {
	decorations: (v) => v.decorations,
	provide: (plugin) => [
		EditorView.atomicRanges.of(
			(view) => view.plugin(plugin)?.atomicRanges ?? RangeSet.empty,
		),
		EditorView.outerDecorations.of(
			(view) => view.plugin(plugin)?.outerDecorations ?? Decoration.none,
		),
	],
});

export function mkConcealPlugin(config: ConcealConfigInput) {
	
	return [concealPlugin, concealTheme, getConcealConfigExtension(config)];
}
