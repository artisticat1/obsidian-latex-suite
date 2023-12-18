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
export const EXCLUSIONS:{[trigger: string]: Environment} = {
	"([A-Za-z])(\\d)": {openSymbol: "\\pu{", closeSymbol: "}"},
	"->": {openSymbol: "\\ce{", closeSymbol: "}"}
}

