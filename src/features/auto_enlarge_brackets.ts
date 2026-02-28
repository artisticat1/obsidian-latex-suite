import { EditorView } from "@codemirror/view";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { getContextPlugin } from "src/utils/context";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { escapeRegex } from "src/editor_extensions/conceal_fns";
import { isContains, inObject } from "src/utils/type_utils";


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
const nestingBrackets = ["{", "}"] as const;
const brackets = {
	"(": ")",
	"[": "]",
	"\\{": "\\}",
	"\\langle": "\\rangle",
	"\\lvert": "\\rvert",
	"\\lVert": "\\rVert",
	"\\lceil": "\\rceil",
	"\\lfloor": "\\rfloor",
} as const;
const delimiters = [
	...sizeControls,
	...Object.keys(brackets) as (keyof typeof brackets)[],
	...Object.values(brackets),
] as const


const rawParser = [
	...delimiters
	.map(escapeRegex)
	.sort((a, b) => a.length - b.length),
	...nestingBrackets.map(escapeRegex)
].join("|")

	;
const parser = new RegExp(rawParser, "g");

type OpenBracket = keyof typeof brackets;
type OpenBracketInfo = {
	index: number;
	match: OpenBracket;
	level: number;
} | {
	match: OpenBracket;
	level: number;
	ignore: true;
}

type CloseToOpen = {[K in keyof typeof brackets as (typeof brackets)[K]]: K};
const closeToOpen: CloseToOpen = Object.fromEntries(
	Object.entries(brackets).map(([open, close]) => [close, open])
) as CloseToOpen;
type ParserResult = typeof delimiters[number] | typeof nestingBrackets[number];
	


export const autoEnlargeBrackets = (view: EditorView) => {
	const settings = getLatexSuiteConfig(view);
	if (!settings.autoEnlargeBrackets) return;

	const ctx = getContextPlugin(view);
	const result = ctx.getBounds();
	if (!result) return false;
	const {inner_start: start, inner_end: end} = result;

	const text = view.state.sliceDoc(start, end);
	const left = "\\left";
	const right = "\\right";

	/**
	 * Algorithm: 
	 * Keep track of all open brackets and remove them once we see a close bracket that closes that bracket.
	 * Ignoring brackets that have a size control already on either side
	 * and ignoring brackets that are not on the same scope {}.
	 */

	const stack: OpenBracketInfo[] = [];
	let match: RegExpExecArray | null;
	let skipNext: number | null = null;
	parser.lastIndex = 0;
	// Grouping as `0{1{2}1{3}1}0{4}0` as latex only allows `\left ... \right` within the same scope like this.
	let nextGroupId = 0;
	const scopeStack: number[] = [nextGroupId];

	while ((match = parser.exec(text)) !== null) {
		const token = match[0] as ParserResult;
		const index = match.index;
		if (isContains(sizeControls, token)) {
			skipNext = index + token.length;
			continue
		} else if (isContains(nestingBrackets, token)) {
			if (token === "{") {
				scopeStack.push(++nextGroupId);	
			} else if (scopeStack.length > 1){
				scopeStack.pop();
			}
			continue
		} else if (inObject(brackets, token)) {
			if (skipNext === null || /\S/.test(text.slice(skipNext, index))) {
				stack.push({index, match: token, level: scopeStack[scopeStack.length - 1]});
			} else if (skipNext !== null) {
				stack.push({match: token, ignore: true, level: scopeStack[scopeStack.length - 1]});
			}
			skipNext = null;
			continue
		}
		const skipCurrent = skipNext !== null && !/\S/.test(text.slice(skipNext, index));
		skipNext = null;
		const expectedOpen = closeToOpen[token];
		for (let i = stack.length - 1; i >= 0; i--) {
			const openMatch = stack[i];
			if (openMatch.match === expectedOpen && ("ignore" in openMatch || skipCurrent)) {
				stack.splice(i, 1);
				break;
			}
			// Same nesting level because ({[)})-> `\left({[\right)})` is invalid latex.
			if ("ignore" in openMatch) continue;
			if (openMatch.level !== scopeStack[scopeStack.length - 1]) continue;
			if (openMatch.match !== expectedOpen) continue;

			const openStart = openMatch.index;
			const openToken = openMatch.match;
			const openEnd = openStart + openToken.length;
			const closeStart = match.index;

			const bracketContents = text.slice(openEnd, closeStart);

			const containsTrigger = settings.autoEnlargeBracketsTriggers.some(word =>
				bracketContents.contains(word)
			);
			if (!containsTrigger) break;

			queueSnippet(view, start + openStart, start + openEnd, left + openToken + " ");
			queueSnippet(view, start + closeStart, start + closeStart + token.length, " " + right + token);

			stack.splice(i, 1);
			break;
		}
	}

	expandSnippets(view);
}
