import { EditorView } from "@codemirror/view";

import { isInsideEnvironment, isWithinEquation, isWithinInlineEquation } from "./editor_helpers";

export class Mode {
	text!: boolean;
	inlineMath!: boolean;
	blockMath!: boolean;
	code!: boolean;

	constructor() {
		this.text = false;
		this.blockMath = false;
		this.inlineMath = false;
		this.code = false;
	}

	anyMath():boolean {
		return this.inlineMath || this.blockMath;
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
