import { EditorView } from "@codemirror/view";
import { replaceRange, setCursor, getCharacterAtPos } from "src/utils/editor_utils";
import { Context } from "src/utils/context";


const RIGHT_TOKEN = "\\right";
const CLOSING_BRACKETS = [
	")",
	"]", "\\rbrack",
	"}",
	"\\}", "\\rbrace",
	"\\rangle",
	"\\rceil", "\\rfloor",
	"\\urcorner",
	"\\vert",
	"\\|", "\\Vert",
	"$"
];
const DELIMITERS = [
	"(", ")",
	"[", "]", "\\lbrack", "\\rbrack",
	"\\{", "\\}", "\\lbrace", "\\rbrace",
	"<", ">", "\\langle", "\\rangle", "\\lt", "\\gt",
	"\\lfloor", "\\rfloor", "\\lceil", "\\rceil",
	"/", "\\\\", "\\backslash",
	"|", "\\vert",
	"\\|", "\\Vert",
	"\\uparrow", "\\downarrow", "\\Uparrow", "\\Downarrow",
	"\\ulcorner", "\\urcorner",
	"."
];


const matchClosingBracket = (text: string, startIndex: number): number => {
	const sortedDelimiter = [...CLOSING_BRACKETS].sort((a, b) => b.length - a.length);

	for (const delimiter of sortedDelimiter) {
		if (text.slice(startIndex, startIndex + delimiter.length) === delimiter) {
			return delimiter.length;
		}
	}

	return 0;
}


const matchRightCommand = (text: string, startIndex: number): number => {
	if (!text.startsWith(RIGHT_TOKEN, startIndex)) {
		return 0;
	}

	const afterTokenIndex = startIndex + RIGHT_TOKEN.length;

	let whitespaceCount = 0;
	while (afterTokenIndex + whitespaceCount < text.length && /\s/.test(text.charAt(afterTokenIndex + whitespaceCount))) {
		whitespaceCount++;
	}
	const delimiterStartIndex = afterTokenIndex + whitespaceCount;

	const sortedDelimiter = [...DELIMITERS].sort((a, b) => b.length - a.length);
	for (const delimiter of sortedDelimiter) {
		if (text.slice(delimiterStartIndex, delimiterStartIndex + delimiter.length) === delimiter) {
			return RIGHT_TOKEN.length + whitespaceCount + delimiter.length;
		}
	}

	// If no matching delimiter is found, return the length of \right
	// This helps users to easily identify and correct missing delimiter
	return RIGHT_TOKEN.length;
}


export const tabout = (view: EditorView, ctx: Context):boolean => {
	if (!ctx.mode.inMath()) return false;

	const result = ctx.getBounds();
	if (!result) return false;
	const end = result.end;

	const pos = view.state.selection.main.to;
	const d = view.state.doc;
	const text = d.toString();

	// Move to the next closing bracket
	for (let i = pos; i < end; i++) {
		const rightCommandLength = matchRightCommand(text, i);
		if (rightCommandLength > 0) {
			setCursor(view, i + rightCommandLength);

			return true;
		}

		const rightBracketLength = matchClosingBracket(text, i);
		if (rightBracketLength > 0) {
			setCursor(view, i + rightBracketLength);

			return true;
		}
	}


	// If cursor at end of line/equation, move to next line/outside $$ symbols

	// Check whether we're at end of equation
	// Accounting for whitespace, using trim
	const textBtwnCursorAndEnd = d.sliceString(pos, end);
	const atEnd = textBtwnCursorAndEnd.trim().length === 0;

	if (!atEnd) return false;


	// Check whether we're in inline math or a block eqn
	if (ctx.mode.inlineMath || ctx.mode.codeMath) {
		setCursor(view, end + 1);
	}
	else {
		// First, locate the $$ symbol
		const dollarLine = d.lineAt(end+2);

		// If there's no line after the equation, create one

		if (dollarLine.number === d.lines) {
			replaceRange(view, dollarLine.to, dollarLine.to, "\n");
		}

		// Finally, move outside the $$ symbol
		setCursor(view, dollarLine.to + 1);


		// Trim whitespace at beginning / end of equation
		const line = d.lineAt(pos);
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