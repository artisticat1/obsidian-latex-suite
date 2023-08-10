import { EditorView } from "@codemirror/view";
import { getCodeblockBounds, getEquationBounds, isInsideEnvironment, isWithinEquation, isWithinInlineEquation, langIfWithinCodeblock } from "src/editor_helpers";
import LatexSuitePlugin from "src/main";
import { Mode } from "./options";

export class Context {
	pos: number;
	mode!: Mode;
	codeblockLanguage: string;
	mathBounds: { start: number, end: number };
}

export function ctxAtViewPos(view: EditorView, pos: number, plugin: LatexSuitePlugin):Context {
	let ctx = new Context();
	ctx.pos = pos;
	ctx.mode = new Mode();

	const codeblockLanguage = langIfWithinCodeblock(view);
	const inCode = codeblockLanguage !== null;
	const ignoreMath = plugin.ignoreMathLanguages.contains(codeblockLanguage);
	const forceMath = plugin.forceMathLanguages.contains(codeblockLanguage);

	let inMath = forceMath || (
		!ignoreMath
		&& isWithinEquation(view.state)
		&& !(
			isInsideEnvironment(view, pos, {openSymbol: "\\text{", closeSymbol: "}"})
			|| isInsideEnvironment(view, pos, {openSymbol: "\\tag{", closeSymbol: "}"})
		)
	);

	if (inMath) {
		const inInlineEquation = isWithinInlineEquation(view.state);

		ctx.mode.blockMath = !inInlineEquation;
		ctx.mode.inlineMath = inInlineEquation;
		if (forceMath) {
			// means a codeblock language triggered the math mode -> use the codeblock bounds instead
			ctx.mathBounds = getCodeblockBounds(view.state, pos);
		} else {
			ctx.mathBounds = getEquationBounds(view.state, pos);
		}
	} else {
		ctx.mode.blockMath = false;
		ctx.mode.inlineMath = false;
	}

	ctx.mode.code = inCode && !forceMath;
	if (ctx.mode.code) {
		ctx.codeblockLanguage = codeblockLanguage;
	}

	ctx.mode.text = !inCode && !inMath;

	return ctx;
}

