import { Prec, Range } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { Bounds, getMathBoundsPlugin, MathMode } from "src/utils/context";
import * as latex from "src/parser/mathjax/latex-parser.terms";
import { EquationText, iterateTreeCursor } from "src/utils/tokenizer";

type DollarBounds =
	| (Bounds & { kind: "pair", mode: MathMode })
	| { from: number; to: number; kind: "error" };
class HighlightDollarPlugin implements PluginValue {
	decorations: DecorationSet = Decoration.none;

	update(update: ViewUpdate) {
		if (!update.docChanged && !update.viewportChanged) return;
		this.decorations = this.computeDecorations(update.view);
	}

	computeDecorations(view: EditorView): DecorationSet {
		const boundsPlugin = getMathBoundsPlugin(view);
		const dollar_ranges: DollarBounds[] = [];
		const mathBounds = boundsPlugin.mathBounds;
		mathBounds.forEach((bound) => {
			if (bound.inner_end === bound.outer_end) {
				dollar_ranges.push({
					from: bound.outer_start,
					to: bound.outer_end,
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
						const child = dollars[0];
						dollar_ranges.push({
							from: child.from,
							to: child.to,
							kind: "error",
						});
					} else if (dollars.length === 2) {
						dollar_ranges.push({
							outer_start: dollars[0].from,
							inner_start: dollars[0].to,
							inner_end: dollars[1].from,
							outer_end: dollars[1].to,
							kind: "pair",
							mode: MathMode.InlineMath,
						});
					}
					const last = dollars.last();
					if (last) {
						cursor.moveTo(last.to, -1);
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
			if (bounds.kind === "error") {
				widgets.push(
					Decoration.mark({
						class: "latex-suite-error-dollar",
					}).range(bounds.from, bounds.to),
				);
			} else {
				let modeClass: "inline" | "block" | "code";
				if (bounds.mode === MathMode.InlineMath || (bounds.mode === MathMode.BlockMath && bounds.outer_start - bounds.outer_end < 4)) {
					modeClass = "inline";
				} else if (bounds.mode === MathMode.BlockMath) {
					modeClass = "block";
				} else {
					modeClass = "code";
				}
				widgets.push(
					Decoration.mark({
						class: `latex-suite-highlighted-dollar-${modeClass}`,
					}).range(bounds.outer_start, bounds.inner_start),
					Decoration.mark({
						class: `latex-suite-highlighted-dollar-${modeClass}`,
					}).range(bounds.inner_end, bounds.outer_end),
				);
			}
		}
		// should be sorted already.
		return Decoration.set(widgets, true);
	}
}

export const highlight_dollar = Prec.highest(
	ViewPlugin.fromClass(HighlightDollarPlugin, {
		decorations: (v) => v.decorations,
	}),
);
