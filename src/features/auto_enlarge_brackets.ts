import { EditorView } from "@codemirror/view";
import { findMatchingBracket } from "src/utils/editor_utils";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { Context } from "src/utils/context";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";


export const autoEnlargeBrackets = (view: EditorView) => {
	const settings = getLatexSuiteConfig(view);
	if (!settings.autoEnlargeBrackets) return;

	// The Context needs to be regenerated since changes to the document may have happened before autoEnlargeBrackets was triggered
	const ctx = Context.fromView(view);
	const result = ctx.getBounds();
	if (!result) return false;
	const {start, end} = result;

	const text = view.state.doc.toString();
	const left = "\\left";
	const right = "\\right";


	for (let i = start; i < end; i++) {

		const brackets:{[open: string]: string} = {"(": ")", "[": "]", "\\{": "\\}", "\\langle": "\\rangle", "\\lvert": "\\rvert", "\\lVert": "\\rVert", "\\lceil": "\\rceil", "\\lfloor": "\\rfloor"};
		const openBrackets = Object.keys(brackets);
		let found = false;
		let open = "";

		for (const openBracket of openBrackets) {
			if (text.slice(i, i + openBracket.length) === openBracket) {
				found = true;
				open = openBracket;
				break;
			}
		}

		if (!found) continue;
		const bracketSize = open.length;
		const close = brackets[open];


		const j = findMatchingBracket(text, i, open, close, false, end);
		if (j === -1) continue;


		// If \left and \right already inserted, ignore
		if ((text.slice(i-left.length, i) === left) && (text.slice(j-right.length, j) === right)) continue;


		// Check whether the brackets contain sum, int or frac
		const bracketContents = text.slice(i+1, j);
		const containsTrigger = settings.autoEnlargeBracketsTriggers.some(word => bracketContents.contains("\\" + word));

		if (!containsTrigger) {
			i = j;
			continue;
		}

		// Enlarge the brackets
		queueSnippet(view, i, i+bracketSize, left + open + " ");
		queueSnippet(view, j, j+bracketSize, " " + right + close);
	}

	expandSnippets(view);
}
