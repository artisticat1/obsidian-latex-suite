import { TransactionSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Context } from "src/utils/context";
import { setCursor, getCharacterAtPos } from "src/utils/editor_utils";
import { Token, tokenize } from "src/utils/tokenizer";


const LEFT_COMMANDS = new Set<string>([
	"\\left",
	"\\bigl", "\\Bigl", "\\biggl", "\\Biggl"
]);
const RIGHT_COMMANDS = new Set<string>([
	"\\right",
	"\\bigr", "\\Bigr", "\\biggr", "\\Biggr"
]);
const DELIMITERS = new Set<string>([
	"(", ")",
	"[", "]", "\\lbrack", "\\rbrack",
	"\\{", "\\}", "\\lbrace", "\\rbrace",
	"<", ">", "\\langle", "\\rangle", "\\lt", "\\gt",
	"|", "\\vert", "\\lvert", "\\rvert",
	"\\|", "\\Vert", "\\lVert", "\\rVert",
	"\\lfloor", "\\rfloor",
	"\\lceil", "\\rceil",
	"\\ulcorner", "\\urcorner",
	"/", "\\\\", "\\backslash",
	"\\uparrow", "\\downarrow",
	"\\Uparrow", "\\Downarrow",
	"."
]);


const isLeftCommandToken = (token: Token): boolean => LEFT_COMMANDS.has(token.text);
const isRightCommandToken = (token: Token): boolean => RIGHT_COMMANDS.has(token.text);
const isDelimiterToken = (token: Token): boolean => DELIMITERS.has(token.text);
const isClosingSymbolToken = (token: Token, closingSymbols: Set<string>): boolean => closingSymbols.has(token.text);


const isClosingDelimiterToken = (tokens: Token[], index: number, closingSymbols: Set<string>): boolean => {
	const current = tokens[index];

	if (index > 0) {
		const prev = tokens[index - 1];

		if (isRightCommandToken(prev) && isDelimiterToken(current)) return true;
		if (isLeftCommandToken(prev) && isDelimiterToken(current)) return false;
	}

	return isClosingSymbolToken(current, closingSymbols);
};


const isUnmatchedRightCommand = (tokens: Token[], index: number): boolean => {
	const current = tokens[index];
	if (!isRightCommandToken(current)) return false;

	if (index + 1 >= tokens.length) {
		return true;
	}

	const next = tokens[index + 1];
	return !isDelimiterToken(next);
};


export const tabout = (view: EditorView, ctx: Context): boolean => {
	if (!ctx.mode.inMath()) return false;

	const bounds = ctx.getBounds();
	if (!bounds) return false;
    const { start, end } = bounds;

	const doc = view.state.doc;
	
    const cursorPos = view.state.selection.main.to;
    const cursorRelativePos = cursorPos - start;

    const latexString = doc.sliceString(start, end);
    const tokens = tokenize(latexString);

    const closingSymbols = getLatexSuiteConfig(view).taboutClosingSymbols;

	const foundIndex = tokens.findIndex((token) => token.end > cursorRelativePos);
	// If no token exists after the cursor, set start index to length to skip the loop entirely.
    const startIndex = foundIndex === -1 ? tokens.length : foundIndex;
    for (let i = startIndex; i < tokens.length; i++) {
		// Case 1: Normal Navigation
		if (isClosingDelimiterToken(tokens, i, closingSymbols)) {
			setCursor(view, start + tokens[i].end);

			return true;
		}

		// Case 2: Error Recovery
		// While the action (setCursor) is the same as above, the intent here is different:
		// we navigate the user directly to the location of the error (immediately after the unfinished "\right")
        // so they can simply type the missing delimiter right there.
		if (isUnmatchedRightCommand(tokens, i)) {
			console.warn("[tabout] Found right command without following delimiter:", tokens[i].text, "at index", start + tokens[i].start);

			setCursor(view, start + tokens[i].end);

			return true;
		}
	}

	// If cursor at end of line/equation, move to next line/outside $$ symbols

	// Check whether we're at end of equation
	// Accounting for whitespace, using trim
	const remainingText = doc.sliceString(cursorPos, end);
	const isAtEnd = remainingText.trim().length === 0;

	if (!isAtEnd) return false;

	// Check whether we're in inline math or a block eqn
	if (ctx.mode.inlineMath || ctx.mode.codeMath) {
		setCursor(view, end + 1);
	}
	else {
		// First, locate the $$ symbol
		const endLine = doc.lineAt(end + 2);
		const transactions: TransactionSpec[] = [];

		// If there's no line after the equation, create one
		if (endLine.number === doc.lines) {
			transactions.push({changes: {from: endLine.to, to: endLine.to, insert: "\n"}, selection: {anchor: endLine.to + 1}});
		} else {
			transactions.push({});
		}

		// Finally, move outside the $$ symbol. Merged with previous transaction to avoid out of bounds error.
		transactions[0].selection = {anchor: endLine.to+1};

		// Trim whitespace at beginning / end of equation
		const currentLine = doc.lineAt(cursorPos);
		if (currentLine.text.trim() !== currentLine.text) {
			transactions.push({
				changes: {from: currentLine.from, to: currentLine.to, insert: currentLine.text.trim()}
			})
		}
		view.dispatch(...transactions);
	}

	return true;
};


export const shouldTaboutByCloseBracket = (view: EditorView, keyPressed: string) => {
	const sel = view.state.selection.main;
	if (!sel.empty) return false;

	const pos = sel.from;
	const char = getCharacterAtPos(view, pos);
	const brackets = [")", "]", "}"];

	return (char === keyPressed) && brackets.includes(char);
};
