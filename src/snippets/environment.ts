import { type MacroArgs } from "src/editor_context/default_text_areas";

/**
 * defines a math environment, where semantics for snippets may change from how they'd usually behave in math mode
 */
export interface Environment {
	openSymbol: string;
	closeSymbol: string;
}

/**
 * a mapping of triggers to environments where they should not run
 */
export const EXCLUSIONS: { [trigger: string]: MacroArgs[] } = {
	"([A-Za-z])(\\d)": [
		{ name: "ce" },
		{ name: "pu" },
	],
	"->": [{ name: "ce" }],
};
