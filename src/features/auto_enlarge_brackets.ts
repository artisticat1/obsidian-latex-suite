import { EditorView } from "@codemirror/view";
import { findMatchingBracket } from "src/utils/editor_utils";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { getContextPlugin } from "src/utils/context";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { escapeRegex } from "src/editor_extensions/conceal_fns";


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
];
const sizeControlPattern = "(?:" + sizeControls.map(escapeRegex).join("|") + "\\s*)$";
const sizeControlParser = new RegExp(sizeControlPattern, "s");
const brackets: { [open: string]: string } = {
	"(": ")",
	"[": "]",
	"\\{": "\\}",
	"\\langle": "\\rangle",
	"\\lvert": "\\rvert",
	"\\lVert": "\\rVert",
	"\\lceil": "\\rceil",
	"\\lfloor": "\\rfloor",
};
const rawParser = [
	...sizeControls,
	...Object.keys(brackets),
	...Object.values(brackets),
]
	.map((s) => escapeRegex(s))
	.sort((a,b) => a.length - b.length)
	.join("|");
const parser = new RegExp(rawParser, "g");

export const autoEnlargeBrackets = (view: EditorView) => {
	const settings = getLatexSuiteConfig(view);
	if (!settings.autoEnlargeBrackets) return;

	// The Context needs to be regenerated since changes to the document may have happened before autoEnlargeBrackets was triggered
	const ctx = getContextPlugin(view);
	const result = ctx.getBounds();
	if (!result) return false;
	const {inner_start: start, inner_end: end} = result;

	const text = view.state.sliceDoc(start, end);
	const left = "\\left";
	const right = "\\right";


	let match: RegExpExecArray | null;
	let skip: number | null = null;
	parser.lastIndex = 0;
	while ((match = parser.exec(text)) !== null) {
		let found = false;
		let open = "";
		if (
			match[0] in brackets &&
			(skip === null || /\S/.test(text.slice(skip, match.index)))
		) {
			found = true;
			skip = null;
			open = match[0];
		} else if (sizeControls.contains(match[0])) {
			skip = match.index + match[0].length;
		}
		if (!found) continue;
		const bracketSize = open.length;
		const close = brackets[open];
		const i = match.index;


		const j = findMatchingBracket(text, i, open, close, false);
		if (j === -1) continue;

		// Check whether the brackets contain sum, int or frac
		const bracketContents = text.slice(i+1, j);
		const containsTrigger = settings.autoEnlargeBracketsTriggers.some(word => bracketContents.contains(word));

		if (!containsTrigger) {
			continue;
		}
		if (sizeControlParser.test(bracketContents)) {
			continue;
		}

		// Enlarge the brackets
		queueSnippet(view, start + i, start + i + bracketSize, left + open + " ");
		queueSnippet(view, start + j, start + j + bracketSize, " " + right + close);
	}

	expandSnippets(view);
}
