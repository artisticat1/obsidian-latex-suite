import { EditorView } from "@codemirror/view";
import { replaceRange, setCursor, getCharacterAtPos } from "src/utils/editor_utils";
import { Context } from "src/utils/context";


export const tabout = (view: EditorView, ctx: Context):boolean => {
    if (!ctx.mode.inMath()) return false;

	const result = ctx.getBounds();
	if (!result) return false;
	const end = result.end;

	const pos = view.state.selection.main.to;
	const d = view.state.doc;
	const text = d.toString();

	// Move to the next closing bracket: }, ), ], >, |, or \\rangle
	const rangle = "\\rangle";

	for (let i = pos; i < end; i++) {
		if (["}", ")", "]", ">", "|", "$"].contains(text.charAt(i))) {
			setCursor(view, i+1);

			return true;
		}
		else if (text.slice(i, i + rangle.length) === rangle) {
			setCursor(view, i + rangle.length);

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