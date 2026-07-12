import { EditorView } from "@codemirror/view";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { getMathBoundsPlugin } from "src/utils/context";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { isContains } from "src/utils/type_utils";
import { emptyInsertOptions, TextNode } from "src/snippets/luasnip_api/node";
import { pairBrackets, traverseTree } from "src/editor_extensions/highlight_brackets";
import { EquationText } from "src/utils/tokenizer";
import { walkPairedBrackets } from "src/utils/tokenizer";
import { SyntaxNode } from "@lezer/common";
import * as latex from "src/parser/mathjax/latex-parser.terms"


const sizeControls = [
	"\\big",
	"\\Big",
	"\\bigg",
	"\\Bigg",
	"\\bigl",
	"\\Bigl",
	"\\biggl",
	"\\Biggl",
	"\\bigr",
	"\\Bigr",
	"\\biggr",
	"\\Biggr",
	"\\left",
	"\\right",
] as const;

// math delimiters can't be enlarged, but \[\] is not valid in mathjax so only match \(\).

function isSizeControl(tree: SyntaxNode, from: number, doc: EquationText) {
	const node = tree.resolveInner(from, -1)
	if (!node.type.is(latex.CtrlSeq)) {
		return false
	}
	const token = doc.slice(node.from, node.to)
	return isContains(sizeControls, token)
}

export const autoEnlargeBrackets = (view: EditorView) => {
	const settings = getLatexSuiteConfig(view);
	if (!settings.autoEnlargeBrackets) return;
	const overlays = getMathBoundsPlugin(view).getEquationOverlays(view.state)
	const pos = view.state.selection.main.head
	const covered_overlay = overlays.filter(o => o.bound.inner_start <= pos && o.bound.inner_end >= pos)[0]
	if (!covered_overlay) {
		return
	}
	
	const left = "\\left"
	const right = "\\right"

	const doc = new EquationText(covered_overlay.text, covered_overlay.overlay.from, covered_overlay.overlay.to)
	const tokens = pairBrackets(traverseTree(covered_overlay.bound.tree, doc))
	for (const {region: bracket} of walkPairedBrackets(tokens)) {
		if (bracket.kind !== "bracket") {
			continue
		}
		const openBracket = doc.slice(bracket.open.from, bracket.open.to)
		const closeBracket = doc.slice(bracket.close.from, bracket.close.to)
		if (openBracket === "{" || openBracket === "\\(" || openBracket.startsWith("\\left") || closeBracket.startsWith("\\right")) {
			continue;
		}
		if (isSizeControl(covered_overlay.bound.tree, bracket.open.from, doc)) {
			continue
		}
		const bracketContent = doc.slice(bracket.open.to, bracket.close.from)
		if (settings.autoEnlargeBracketsTriggers.every(trigger => !bracketContent.includes(trigger))) {
			continue
		}
		const space = settings.autoEnlargeBracketsSpace ? " " : "";
		const leftNode = new TextNode(left + openBracket + space);
		const rightNode = new TextNode(space + right + closeBracket);
		queueSnippet(view, bracket.open.from, bracket.open.to, leftNode.applyInsert(emptyInsertOptions));
		queueSnippet(view, bracket.close.from, bracket.close.to, rightNode.applyInsert(emptyInsertOptions));

		// stack.splice(i, 1);
		// break;
	}

	expandSnippets(view);
}
