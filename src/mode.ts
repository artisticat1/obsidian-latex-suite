import { EditorView } from "@codemirror/view";

import { isInsideEnvironment, isWithinEquation, isWithinInlineEquation } from "./editor_helpers";

export class Mode {
	text!: boolean;
	inlineMath!: boolean;
	blockMath!: boolean;
	code!: boolean;

	constructor(view: EditorView, pos: number) {
		let inMath = isWithinEquation(view.state)
			&& !(
				isInsideEnvironment(view, pos, {openSymbol: "\\text{", closeSymbol: "}"})
				|| isInsideEnvironment(view, pos, {openSymbol: "\\tag{", closeSymbol: "}"})
			);
		const inInlineEquation = isWithinInlineEquation(view.state);

		this.text = !inMath;
		this.blockMath = inMath && !inInlineEquation;
		this.inlineMath = inMath && inInlineEquation;
		this.code = false; // TODO(multisn8): introduce logic to check for being in a codeblock/inline code
	}

	anyMath():boolean {
		return this.inlineMath || this.blockMath;
	}
}

