import { EditorView } from "@codemirror/view";

import { isInsideEnvironment, isWithinEquation, isWithinInlineEquation } from "./editor_helpers";

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

export function modeAtViewPos(view: EditorView, pos: number):Mode {
	let mode = new Mode();

	let inMath = isWithinEquation(view.state)
		&& !(
			isInsideEnvironment(view, pos, {openSymbol: "\\text{", closeSymbol: "}"})
			|| isInsideEnvironment(view, pos, {openSymbol: "\\tag{", closeSymbol: "}"})
		);
	const inInlineEquation = isWithinInlineEquation(view.state);

	mode.text = !inMath;
	mode.blockMath = inMath && !inInlineEquation;
	mode.inlineMath = inMath && inInlineEquation;
	// TODO(multisn8): introduce logic to check for being in a codeblock/inline code

	return mode;
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
			case "i":
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

	mode
}