import { EditorSelection, EditorState, Prec, Range, SelectionRange } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	type PluginValue,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { type Bounds, MathMode } from "src/editor_context/context";
import { getMathBoundsPlugin } from "src/editor_context/mathbounds";
import { latex } from "src/parser/latex-terms";
import { EquationText, iterateTreeCursor } from "src/utils/tokenizer";

type DollarBounds =
	| (Bounds & { kind: "pair", mode: MathMode })
	| { from: number; to: number; kind: "error" };

const ERROR_CLASS = "latex-suite-error-dollar";
const INLINE_CLASS = "latex-suite-highlighted-dollar-inline";
const BLOCK_CLASS = "latex-suite-highlighted-dollar-block";
const CODE_CLASS = "latex-suite-highlighted-dollar-code";
/**
 * Unhighlight empty dollars when the cursor isn't inside
 * as reading view sees them as normal dollars and not inline math.
 */
const EMPTY_INLINE_CLASS = "latex-suite-highlighted-dollar-empty-inline";

type ClassNames = typeof ERROR_CLASS | typeof INLINE_CLASS | typeof BLOCK_CLASS | typeof CODE_CLASS | typeof EMPTY_INLINE_CLASS;


class HighlightDollarPlugin implements PluginValue {
	decorations: DecorationSet = Decoration.none;

	constructor(view: EditorView) {
		this.decorations = this.computeDecorations(view);
	}

	update(update: ViewUpdate) {
		if (!update.docChanged && !update.viewportChanged && !this.didMoveIntoDollar(update)) return;
		this.decorations = this.computeDecorations(update.view);
	}
	
	didMoveIntoDollar(update: ViewUpdate): boolean {
		if (!update.selectionSet) {
			return false;
		}
		function containsDollar(range: SelectionRange): boolean {
			return range.empty && update.state.sliceDoc(range.from - 1, range.from + 1) === "$$";	
		}
		for (const transaction of update.transactions) {
			if (!transaction.selection) continue;
			const { selection } = transaction;
			for (const range of selection.ranges) {
				if (containsDollar(range)) {
					return true;
				}
			}
		}
		for (const range of update.startState.selection.ranges) {
			if (containsDollar(range)) {
				return true;
			}
		}
		return false;

	}

	computeDecorations(view: EditorView): DecorationSet {
		const boundsPlugin = getMathBoundsPlugin(view);
		const dollar_ranges: DollarBounds[] = [];
		const mathBounds = boundsPlugin.mathBounds;
		mathBounds.forEach((bound) => {
			if (bound.inner_end === bound.outer_end && bound.inner_start !== bound.outer_start) {
				dollar_ranges.push({
					from: bound.outer_start,
					to: bound.inner_start,
					kind: "error",
				});
				return;
			}
			dollar_ranges.push({
				...bound,
				kind: "pair",
				mode: bound.mode
			});
			if (!bound.tree) {
				return;
			}
			const doc = EquationText.fromNode(bound.tree, view.state.doc);
			for (const cursor of iterateTreeCursor(bound.tree, doc)) {
				const { type, node } = cursor;
				if (type.is(latex.DollarInlineMath) || type.is(latex.ParenMath)) {
					const dollars = type.is(latex.DollarInlineMath)
						? node.getChildren(latex.Dollar)
						: [
								node.getChild(latex.OpenParenMath),
								node.getChild(latex.CloseParenMath),
							].filter(child => child !== null);
					if (dollars.length === 1) {
						const child = dollars[0]!;
						dollar_ranges.push({
							from: child.from,
							to: child.to,
							kind: "error",
						});
					} else if (dollars.length === 2) {
						const open = dollars[0]!;
						const close = dollars[1]!;
						dollar_ranges.push({
							outer_start: open.from,
							inner_start: open.to,
							inner_end: close.from,
							outer_end: close.to,
							kind: "pair",
							mode: MathMode.InlineMath,
						});
					}
					const last = dollars.last();
					if (last) {
						doc.moveTo(cursor, last.to, -1);
					}
				} else if (type.is(latex.Dollar) || type.is(latex.OpenParenMath) || type.is(latex.CloseParenMath)) {
					dollar_ranges.push({
						from: node.from,
						to: node.to,
						kind: "error",
					});
				}
			}
		});

		const widgets: Range<Decoration>[] = [];
		for (const bounds of dollar_ranges) {
			if (
				(bounds.kind === "error" && bounds.from === bounds.to) ||
				(bounds.kind === "pair" &&
					bounds.outer_start === bounds.inner_start &&
					bounds.inner_end === bounds.outer_end)
			) {
				continue;
			}
			if (bounds.kind === "error") {
				widgets.push(
					Decoration.mark({
						class: ERROR_CLASS,
					}).range(bounds.from, bounds.to),
				);
			} else {
				let modeClass: ClassNames;
				if (emptyMarkdownDollars(bounds, view.state)) {
					modeClass = EMPTY_INLINE_CLASS;
				} else if (bounds.mode === MathMode.InlineMath || (bounds.mode === MathMode.BlockMath && bounds.outer_start - bounds.outer_end < 4)) {
					modeClass = INLINE_CLASS;
				} else if (bounds.mode === MathMode.BlockMath) {
					modeClass = BLOCK_CLASS;
				} else {
					modeClass = CODE_CLASS;
				}
				widgets.push(
					Decoration.mark({
						class: modeClass,
					}).range(bounds.outer_start, bounds.inner_start),
					Decoration.mark({
						class: modeClass,
					}).range(bounds.inner_end, bounds.outer_end),
				);
			}
		}
		// should be sorted already.
		return Decoration.set(widgets, true);
	}
}

const highlight_dollar_theme = EditorView.baseTheme({
	[`.${ERROR_CLASS}`]: {
		color: "#f00",
	},

	[`.${INLINE_CLASS}`]: {
		color: "#61ae08",
	},

	[`.${BLOCK_CLASS}`]: {
		color: "#3e7202",
	},

	[`.${CODE_CLASS}`]: {
		color: "#54940b",
	},
	
	[`.${EMPTY_INLINE_CLASS}`]: {
		color: "var(--text-normal)",
		fontStyle: "normal",
	},
})

export const highlight_dollar_extension = [
	Prec.highest(
		ViewPlugin.fromClass(HighlightDollarPlugin, {
			decorations: (v) => v.decorations,
		}),
	),
	highlight_dollar_theme,
];

function emptyMarkdownDollars(
	bounds: Bounds & { kind: "pair"; mode: MathMode },
	state: EditorState,
): boolean {
	const { doc, selection } = state;
	return (
		bounds.mode === MathMode.InlineMath &&
		doc.sliceString(bounds.outer_start, bounds.outer_end) === "$$" &&
		!emptySelectionRangeContainsPos(selection, bounds.inner_start)
	);
}

function emptySelectionRangeContainsPos(selection: EditorSelection, pos: number) {
	for (const range of selection.ranges) {
		if (!range.empty) continue;
		if (pos >= range.from && pos <= range.to) {
			return true;
		}
	}
	return false;
}
