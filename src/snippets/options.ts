import { EditorView } from "@codemirror/view";

import { getEquationBounds, isInsideEnvironment, isWithinEquation, isWithinInlineEquation, langIfWithinCodeblock } from "src/editor_helpers";
import LatexSuitePlugin from "src/main";

export class Options {
	mode!: Mode;
	automatic: boolean;
	regex: boolean;
	onWordBoundary: boolean;

	constructor() {
		this.mode = new Mode();
		this.automatic = false;
		this.regex = false;
		this.onWordBoundary = false;
	}
}

export function parseOptions(source: string):Options {
	let options = new Options();
	options.mode = parseMode(source);

	for (const flag_char of source) {
		switch (flag_char) {
			case "A":
				options.automatic = true;
				break;
			case "r":
				options.regex = true;
				break;
			case "w":
				options.onWordBoundary = true;
				break;
		}
	}

	return options;
}

export class Mode {
	text!: boolean;
	inlineMath!: boolean;
	blockMath!: boolean;
	code!: boolean;

	anyMath():boolean {
		return this.inlineMath || this.blockMath;
	}

	constructor() {
		this.text = false;
		this.blockMath = false;
		this.inlineMath = false;
		this.code = false;
	}

	invert() {
		this.text = !this.text;
		this.blockMath = !this.blockMath;
		this.inlineMath = !this.inlineMath;
		this.code = !this.code;
	}

	overlaps(other: Mode):boolean {
		return (this.text && other.text)
			|| (this.blockMath && other.blockMath)
			|| (this.inlineMath && other.blockMath)
			|| (this.code && other.code);
	}
}

export class Context {
	pos: number;
	mode!: Mode;
	codeblockLanguage: string;
	mathBounds: { start: number, end: number };
}

export function ctxAtViewPos(view: EditorView, pos: number, plugin: LatexSuitePlugin):Context {
	let ctx = new Context();
	ctx.mode = new Mode();

	const codeblockLanguage = langIfWithinCodeblock(view);
	const inCode = codeblockLanguage !== null;
	const ignoreMath = plugin.ignoreMathLanguages.contains(codeblockLanguage);
	const forceMath = plugin.forceMathLanguages.contains(codeblockLanguage);
	console.log(codeblockLanguage, inCode, ignoreMath, forceMath);

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
		ctx.mathBounds = getEquationBounds(view.state, pos);
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

export function parseMode(source: string):Mode {
	let mode = new Mode();

	if (source.length === 0) {
		// for backwards compat we need to assume that this is a catchall mode then
		mode.invert();
		return mode;
	}

	for (const flag_char of source) {
		switch (flag_char) {
			case "m":
				mode.blockMath = true;
				mode.inlineMath = true;
				break;
			case "k":
				mode.inlineMath = true;
				break;
			case "M":
				mode.blockMath = true;
				break;
			case "t":
				mode.text = true;
				break;
			case "c":
				mode.code = true;
				break;
		}
	}

	return mode;
}
