import { EditorView } from "@codemirror/view";

import { isInsideEnvironment, isWithinEquation, isWithinInlineEquation } from "./editor_helpers";

export class Mode {
	text!: boolean;
	inline_math!: boolean;
	block_math!: boolean;
	code!: boolean;

	constructor(view: EditorView, pos: number) {
		let inMath = isWithinEquation(view.state)
			&& !(
				isInsideEnvironment(view, pos, {openSymbol: "\\text{", closeSymbol: "}"})
				|| isInsideEnvironment(view, pos, {openSymbol: "\\tag{", closeSymbol: "}"})
			);
		const inInlineEquation = isWithinInlineEquation(view.state);

		this.text = !inMath;
		this.block_math = inMath && !inInlineEquation;
		this.inline_math = inMath && inInlineEquation;
		this.code = false; // TODO(multisn8): introduce logic to check for being in a codeblock/inline code
	}

	any_math():boolean {
		return this.inline_math || this.block_math;
	}
}

