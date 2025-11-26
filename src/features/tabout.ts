import { EditorView } from "@codemirror/view";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Context } from "src/utils/context";
import { replaceRange, setCursor, getCharacterAtPos } from "src/utils/editor_utils";
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


const isLeftCommandToken = (token: Token): boolean =>
	LEFT_COMMANDS.has(token.text);


const isRightCommandToken = (token: Token): boolean =>
	RIGHT_COMMANDS.has(token.text);


const isDelimiterToken = (token: Token): boolean =>
	DELIMITERS.has(token.text);


const isClosingSymbolToken = (token: Token, closingSymbols: Set<string>): boolean =>
	closingSymbols.has(token.text);


const isClosingDelimiterToken = (tokens: Token[], startIndex: number, closingSymbols: Set<string>): boolean => {
	const currentToken = tokens[startIndex];
	const previousToken = tokens[startIndex - 1];

	if (previousToken && isDelimiterToken(currentToken)) {
		if (isRightCommandToken(previousToken)) return true;
		if (isLeftCommandToken(previousToken)) return false;
	}

	return isClosingSymbolToken(currentToken, closingSymbols);
};


const isErrorRightCommandToken = (tokens: Token[], startIndex: number): boolean => {
	const currentToken = tokens[startIndex];
	if (!isRightCommandToken(currentToken)) return false;

	const nextToken = tokens[startIndex + 1];
	return !nextToken || !isDelimiterToken(nextToken);
};


export const tabout = (view: EditorView, ctx: Context): boolean => {
	if (!ctx.mode.inMath()) return false;

	const result = ctx.getBounds();
	if (!result) return false;

	const { start, end } = result;

	const currentPosition = view.state.selection.main.to;
	const relativeCurrentPosition = currentPosition - start;

	const doc = view.state.doc;

	const latexText = doc.slice(start, end).toString();
	const tokens = tokenize(latexText);

	const closingSymbols = getLatexSuiteConfig(view).taboutClosingSymbols;

	// Move to the next closing bracket
	let i = tokens.findIndex((token) => token.end > relativeCurrentPosition);
	if (i == -1) i = tokens.length;  // skip the loop body
	for (; i < tokens.length; i++) {
		if (isClosingDelimiterToken(tokens, i, closingSymbols)) {
			setCursor(view, start + tokens[i].end);

			return true;
		}

		if (isErrorRightCommandToken(tokens, i)) {
			console.warn("[tabout] Found right command without following delimiter:", tokens[i].text, "at index", start + tokens[i].start);

			setCursor(view, start + tokens[i].end);

			return true;
		}
	}

	// If cursor at end of line/equation, move to next line/outside $$ symbols

	// Check whether we're at end of equation
	// Accounting for whitespace, using trim
	const textBtwnCursorAndEnd = doc.sliceString(currentPosition, end);
	const atEnd = textBtwnCursorAndEnd.trim().length === 0;

	if (!atEnd) return false;

	// Check whether we're in inline math or a block eqn
	if (ctx.mode.inlineMath || ctx.mode.codeMath) {
		setCursor(view, end + 1);
	}
	else {
		// First, locate the $$ symbol
		const dollarLine = doc.lineAt(end + 2);

		// If there's no line after the equation, create one

		if (dollarLine.number === doc.lines) {
			replaceRange(view, dollarLine.to, dollarLine.to, "\n");
		}

		// Finally, move outside the $$ symbol
		setCursor(view, dollarLine.to + 1);

		// Trim whitespace at beginning / end of equation
		const line = doc.lineAt(currentPosition);
		replaceRange(view, line.from, line.to, line.text.trim());

	}

	return true;
}


export const shouldTaboutByCloseBracket = (view: EditorView, keyPressed: string) => {
	const sel = view.state.selection.main;
	if (!sel.empty) return;
	const pos = sel.from;

	const c = getCharacterAtPos(view, pos);
	const brackets = [")", "]", "}"];

	if ((c === keyPressed) && brackets.contains(c)) {
		return true;
	}
	else {
		return false;
	}
}
