import { EditorView, type PluginValue, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { type Bounds, type CMBound, MathMode } from "./context";
import { EditorState } from "@codemirror/state";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";
import { modifiedSyntaxTree } from "src/parser/language";
import { Type } from "src/parser/mathjax-parser";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { latex } from "src/parser/latex-terms";


type EquationInfo = { text: string; bound: MathBoundWithTree; overlay: CMBound; };

type MathBoundWithTree = MathBounds & { tree: SyntaxNode; };

type MathBounds = Bounds & {
	mode: MathMode;
	tree: SyntaxNode | null;
	overlay: CMBound[];
};

export class MathBoundsPlugin implements PluginValue {
	private _mathBounds: MathBounds[] = [];
	private equationsOverlays: EquationInfo[] | null = null;
	shouldUpdate: boolean = false;

	get mathBounds() {
		return this._mathBounds
	}

	constructor(view: EditorView) {
		this.updateMathBounds(view);
	}

	reset() {
		this._mathBounds = [];
		this.equationsOverlays = null;
		this.shouldUpdate = false;
	}

	getTree(state: EditorState) {
		return modifiedSyntaxTree(state);
	}

	init(view: EditorView) {
		if (this.shouldUpdate) {
			this.equationsOverlays = null;
			this.updateMathBounds(view);
			this.shouldUpdate = false;
		}
		return this;
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.shouldUpdate = true;
		}
	}

	getDollarBounds(node: SyntaxNode): {open: CMBound, close: CMBound} {
		const open = node.firstChild!;
		const close =
			node.lastChild!.name === "Dollar"
				? node.lastChild!
				: { from: node.to, to: node.to };
		return {
			open,
			close
		}
	}

	updateMathBounds(view: EditorView) {
		const tree = modifiedSyntaxTree(view.state);
		const ranges: MathBounds[] = [];
		const settings = getLatexSuiteConfig(view.state);
		for (const { from, to } of view.visibleRanges) {
			tree.iterate({
				from,
				to,
				enter: (nodeRef: SyntaxNodeRef) => {
					if (nodeRef.name === Type.DollarDisplayBlockMath) {
						const { open, close } = this.getDollarBounds(nodeRef.node);
						const children = nodeRef.node.getChildren("DisplayMath")
						if (children.length === 0) {
							ranges.push({
								inner_start: open.to,
								inner_end: close.from,
								outer_start: open.from,
								outer_end: close.to,
								mode: MathMode.BlockMath,
								tree: null,
								overlay: [],
							})
							return;
						}

						const tree = nodeRef.node.enter(children[children.length - 1].to, -1);
						if (!tree) {
							return;
						}

						ranges.push({
							inner_start: open.to,
							inner_end: close.from,
							outer_start: open.from,
							outer_end: close.to,
							mode: MathMode.BlockMath,
							tree,
							overlay: children,
						});
					} else if (
						nodeRef.name === Type.DollarInlineMath ||
						nodeRef.name === Type.DollarDisplayMath
					) {
						const { open, close } = this.getDollarBounds(nodeRef.node);
						const tree = nodeRef.node.getChild("LaTeX");
						if (!tree) {
							return
						}
						const mode = nodeRef.name === Type.DollarInlineMath ? MathMode.InlineMath : MathMode.BlockMath;
						ranges.push({
							inner_start: open.to,
							inner_end: close.from,
							outer_start: open.from,
							outer_end: close.to,
							mode,
							tree,
							overlay: [tree],
						});
					} else if (nodeRef.name === "FencedCode") {
						const infoNode = nodeRef.node.getChild("CodeInfo");
						if (!infoNode) return;
						const language = view.state.sliceDoc(infoNode.from, infoNode.to)
						if (!settings.forceMathLanguages.includes(language)) return;
						const contentNodes = nodeRef.node.getChildren("CodeText");
						const lastNode = contentNodes.last();
						if (!lastNode) return;
						const tree = nodeRef.node.enter(lastNode.to, -1);
						if (tree === null || !tree.type.is(latex.LaTeX)) return;
						ranges.push({
							inner_start: contentNodes[0].from,
							inner_end: lastNode.to,
							outer_start: nodeRef.node.from,
							outer_end: nodeRef.node.to,
							mode: MathMode.CodeMath,
							tree,
							overlay: contentNodes,
						});
					// for excalidraw the topnode is LaTeX but it's also a topnode in the mounted tree
					// thus check if it has a parent instead.
					} else if (nodeRef.type.is(latex.LaTeX) && nodeRef.node.parent === null) {
						ranges.push({
							inner_start: nodeRef.node.from,
							inner_end: nodeRef.node.to,
							outer_start: nodeRef.node.from,
							outer_end: nodeRef.node.to,
							mode: MathMode.BlockMath,
							tree: nodeRef.node,
							overlay: [{ from: nodeRef.from, to: nodeRef.to }],
						});
					}
				},
			});
		}
		this._mathBounds = ranges;
	}

	inMathBound(_state: EditorState, pos: number): MathBounds | null {
		const bounds = this._mathBounds;
		if (
			pos < bounds[0]?.outer_start ||
			pos > bounds[bounds.length - 1]?.outer_end
		) {
			return null;
		}
		// Use binary search to efficiently find if pos is within any math bound
		let left = 0,
			right = bounds.length - 1;
		while (left <= right) {
			const mid = (left + right) >> 1;
			const bound = bounds[mid];
			if (pos < bound.outer_start) {
				right = mid - 1;
			// excalidraw doesn't have delimiters thus they have 0 length and should be ignored for this check
			} else if (pos >= bound.outer_end && bound.outer_end !== bound.inner_end) {
				left = mid + 1;
			} else if (
				pos < bound.inner_start &&
				bound.mode == MathMode.BlockMath &&
				bound.inner_start - bound.outer_start == 2
			) {
				return {
					outer_start: bound.outer_start,
					inner_start: bound.outer_start + 1,
					inner_end: bound.outer_start + 1,
					outer_end: bound.outer_start + 2,
					mode: MathMode.InlineMath,
					tree: null,
					overlay: [],
				};
			} else if (pos < bound.inner_start || pos > bound.inner_end) {
				break;
			} else {
				return bound;
			}
		}
		return null;
	};

	// TODO: maybe support math bounds outside viewport. But not sure if its needed.

	getEquationOverlays(state: EditorState) {
		if (this.equationsOverlays)
			return this.equationsOverlays;
		this.equationsOverlays = this._mathBounds.map((bound) =>
			bound.overlay.length === 0 || bound.tree === null ? null :
			{
				bound,
				overlay: {from: bound.overlay[0].from, to: bound.overlay[bound.overlay.length - 1].to},
				text: state.sliceDoc(bound.overlay[0].from, bound.overlay[bound.overlay.length - 1].to),
			}		
		).filter((x): x is EquationInfo => x !== null);
		return this.equationsOverlays;
	}
}

export const mathBoundsPlugin = ViewPlugin.fromClass(MathBoundsPlugin);

export const getMathBoundsPlugin = (view: EditorView, init: boolean = true) => {
	const plugin = view.plugin(mathBoundsPlugin);
	if (!plugin) {
		throw new Error(
			"MathBoundsPlugin not found, something went wrong with the plugin initialization"
		);
	}
	return init ? plugin.init(view) : plugin;
};

