import { EditorState, StateEffect, StateField, Transaction } from "@codemirror/state";
import LatexSuitePlugin from "src/main";

export const updateEffect = StateEffect.define<LatexSuitePlugin>();

/**
 * Allows access of the plugin and its settings while inside a CM plugin.
 *
 * Yeah, this is kind of weird. I couldn't think of anything better though.
 */
export const pluginProvider = StateField.define<LatexSuitePlugin>({
	create(_: EditorState): LatexSuitePlugin {
		return null;
	},

	update(prevPlugin: LatexSuitePlugin, transaction: Transaction): LatexSuitePlugin {
		for (let effect of transaction.effects) {
			if (effect.is(updateEffect)) {
				return effect.value;
			}
		}

		return prevPlugin;
	}
});
