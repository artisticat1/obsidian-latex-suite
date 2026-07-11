import { Prec, Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Type } from "src/parser/mathjax-parser";
import { Bounds, getMathBoundsPlugin } from "src/utils/context";


type DollarBounds = (Bounds & {kind: "pair"}) | ({from: number, to: number, kind: "error"});
class HighlightDollarPlugin implements PluginValue {
	decorations: DecorationSet = Decoration.none;
	
	constructor(view: EditorView) { }
	
	update(update: ViewUpdate) {
		if (!update.docChanged && !update.viewportChanged) return;
		this.decorations = this.computeDecorations(update.view);
	}
	
	computeDecorations(view: EditorView): DecorationSet {
		const boundsPlugin = getMathBoundsPlugin(view);
		const tree = boundsPlugin.getTree(view.state);
		const dollar_ranges: DollarBounds[] = [];
		const math_names = [Type.DollarDisplayBlockMath, Type.DollarDisplayMath, Type.DollarInlineMath];
		for (const {from, to} of view.visibleRanges) {
			tree.iterate({
				from,
				to,
				enter: (nodeRef) => {
					if (!math_names.includes(nodeRef.name)) return;
					const node = nodeRef.node;
					const start = node.from;
					const end = node.to;
					const ranges = node.getChildren("Dollar");
					if (ranges.length === 2) {
						dollar_ranges.push({
							outer_start: ranges[0].from,
							inner_start: ranges[0].to,
							inner_end: ranges[1].from,
							outer_end: ranges[1].to,
							kind: "pair",
						});
					} else {
						dollar_ranges.push({from: ranges[0].from, to: ranges[0].to, kind: "error"});
					}

				},
			});
		}
		
		const widgets: Range<Decoration>[] = [];
		for (const bounds of dollar_ranges) {
			if (bounds.kind === "error") {
				console.log(bounds.from, bounds.to)
				widgets.push(
					Decoration.mark({
						class: "latex-suite-error-dollar",
						attributes: {
							style: "color: red;",
						}
					}).range(bounds.from, bounds.to),
				);
			} else {
				widgets.push(
					Decoration.mark({
						class: "latex-suite-highlighted-dollar",
						attributes: {
							style: "color: green;",
						}
					}).range(bounds.outer_start, bounds.inner_start),
					Decoration.mark({
						class: "latex-suite-highlighted-dollar",
						attributes: {
							style: "color: green;",
						}
					}).range(bounds.inner_end, bounds.outer_end),
				);
			}
		}
		// should be sorted already.
		return Decoration.set(widgets, false);
	}
}

export const highlight_dollar = Prec.highest(ViewPlugin.fromClass(HighlightDollarPlugin, {
	decorations: (v) => v.decorations,
}))
