import { SelectionRange } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { findMatchingBracket, getCloseBracket, getCodeblockBounds, getEquationBounds, isWithinEquation, isWithinInlineEquation, langIfWithinCodeblock } from "src/editor_helpers";
import LatexSuitePlugin from "src/main";
import { Mode } from "./options";
import { Environment } from "./snippets";

export class Context {
	view: EditorView;
	pos: number;
	ranges: SelectionRange[];
	mode!: Mode;
	codeblockLanguage: string;
	mathBounds: { start: number, end: number };

	isInsideEnvironment(pos: number, env: Environment): boolean {
		if (!this.mode.anyMath()) return false;

		const {start, end} = this.mathBounds;
		const text = this.view.state.sliceDoc(start, end);
		// pos referred to the absolute position in the whole document, but we just sliced the text
		// so now pos must be relative to the start in order to be any useful
		pos -= start;

		const openBracket = env.openSymbol.slice(-1);
		const closeBracket = getCloseBracket(openBracket);

		// Take care when the open symbol ends with a bracket {, [, or (
		// as then the closing symbol, }, ] or ), is not unique to this open symbol
		let offset;
		let openSearchSymbol;

		if (["{", "[", "("].contains(openBracket) && env.closeSymbol === closeBracket) {
			offset = env.openSymbol.length - 1;
			openSearchSymbol = openBracket;
		} else {
			offset = 0;
			openSearchSymbol = env.openSymbol;
		}

		let left = text.lastIndexOf(env.openSymbol, pos - 1);

		while (left != -1) {
			const right = findMatchingBracket(text, left + offset, openSearchSymbol, env.closeSymbol, false);

			if (right === -1) return false;

			// Check whether the cursor lies inside the environment symbols
			if ((right >= pos) && (pos >= left + env.openSymbol.length)) {
				return true;
			}

			if (left <= 0) return false;

			// Find the next open symbol
			left = text.lastIndexOf(env.openSymbol, left - 1);
		}

		return false;
	}
}


export function ctxAtViewPos(view: EditorView, pos: number, ranges: SelectionRange[], plugin: LatexSuitePlugin):Context {
	let ctx = new Context();
	ctx.view = view;
	ctx.pos = pos;
	ctx.ranges = ranges;
	ctx.mode = new Mode();

	const codeblockLanguage = langIfWithinCodeblock(view);
	const inCode = codeblockLanguage !== null;
	const ignoreMath = plugin.ignoreMathLanguages.contains(codeblockLanguage);
	const forceMath = plugin.forceMathLanguages.contains(codeblockLanguage);

	// first, check if math mode should be "generally" on
	let inMath = forceMath || (
		!ignoreMath
		&& isWithinEquation(view.state)
	);

	if (inMath) {
		if (forceMath) {
			// means a codeblock language triggered the math mode -> use the codeblock bounds instead
			ctx.mathBounds = getCodeblockBounds(view.state, pos);
		} else {
			ctx.mathBounds = getEquationBounds(view.state, pos);
		}

		// then check if the environment "temporarily" disables math mode
		inMath = !(
			ctx.isInsideEnvironment(ctx.pos, {openSymbol: "\\text{", closeSymbol: "}"})
			|| ctx.isInsideEnvironment(ctx.pos, {openSymbol: "\\tag{", closeSymbol: "}"})
		);
	}

	if (inMath) {
		const inInlineEquation = isWithinInlineEquation(view.state);

		ctx.mode.blockMath = !inInlineEquation;
		ctx.mode.inlineMath = inInlineEquation;
	} else {
		ctx.mode.blockMath = false;
		ctx.mode.inlineMath = false;
	}

	ctx.mode.code = inCode && !forceMath;
	if (ctx.mode.code) ctx.codeblockLanguage = codeblockLanguage;

	ctx.mode.text = !inCode && !inMath;

	return ctx;
}

