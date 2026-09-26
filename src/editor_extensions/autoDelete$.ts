import type { EditorView } from "codemirror";
import { getMathBoundsPlugin } from "src/editor_context/mathbounds";
import { Type } from "src/parser/mathjax-parser";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { replaceRange } from "src/utils/editor_utils";

export function autoDelete$(view: EditorView) {
	if (!getLatexSuiteConfig(view).autoDelete$) return false;
	const boundPlugin = getMathBoundsPlugin(view);
	const pos = view.state.selection.main.head;
	// check if the cursor is surrounded by Dollar Dollar or only one Dollar.
	const tree = boundPlugin.getTree(view.state);
	const node = tree.resolveInner(pos, -1);
	if (node.name !== Type.Dollar) return false;
	const prevSibling = node.prevSibling;
	const nextSibling = node.nextSibling;
	const nextNextSibling = nextSibling?.nextSibling;
	const parent = node.parent;
	if (node.from < pos && node.to > pos && node.to - node.from == 2) {
		replaceRange(view, node.from, node.to, "");
		return true;
	}
	if (
		prevSibling ||
		!nextNextSibling ||
		!parent ||
		nextNextSibling.name !== Type.Dollar ||
		parent.name !== Type.DollarInlineMath ||
		node.to !== nextNextSibling.from ||
		pos !== node.to
	)
		return false;
	replaceRange(view, node.from, nextNextSibling.to, "");
	return true;
}
