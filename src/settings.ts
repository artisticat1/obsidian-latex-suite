import { DEFAULT_SNIPPETS } from "./default_snippets";

export interface LatexSuiteSettings {
	snippets: string;
	snippetsEnabled: boolean;
	snippetsTrigger: "Tab" | " "
	removeSnippetWhitespace: boolean;
	loadSnippetsFromFile: boolean;
	snippetsFileLocation: string;
	autofractionEnabled: boolean;
	concealEnabled: boolean,
	colorPairedBracketsEnabled: boolean;
	highlightCursorBracketsEnabled: boolean;
	mathPreviewEnabled: boolean;
	autofractionSymbol: string,
	autofractionExcludedEnvs: string,
	autofractionBreakingChars: string;
	matrixShortcutsEnabled: boolean;
	matrixShortcutsEnvNames: string;
	taboutEnabled: boolean;
	autoEnlargeBrackets: boolean;
	autoEnlargeBracketsTriggers: string;
	wordDelimiters: string;
	ignoreMathLanguages: string,
	forceMathLanguages: string,
}

export const DEFAULT_SETTINGS: LatexSuiteSettings = {
	snippets: DEFAULT_SNIPPETS,
	snippetsEnabled: true,
	snippetsTrigger: "Tab",
	removeSnippetWhitespace: true,
	loadSnippetsFromFile: false,
	snippetsFileLocation: "",
	concealEnabled: false,
	colorPairedBracketsEnabled: true,
	highlightCursorBracketsEnabled: true,
	mathPreviewEnabled: true,
	autofractionEnabled: true,
	autofractionSymbol: "\\frac",
	autofractionExcludedEnvs:
	`[
		["^{", "}"],
		["\\\\pu{", "}"]
]`,
	autofractionBreakingChars: "+-=\t",
	matrixShortcutsEnabled: true,
	matrixShortcutsEnvNames: "pmatrix, cases, align, bmatrix, Bmatrix, vmatrix, Vmatrix, array, matrix",
	taboutEnabled: true,
	autoEnlargeBrackets: true,
	autoEnlargeBracketsTriggers: "sum, int, frac, prod",
	wordDelimiters: "., +-\\n\t:;!?\\/{}[]()=~$",
	ignoreMathLanguages: "bash, php, perl, julia, sh",
	forceMathLanguages: "math",
}
