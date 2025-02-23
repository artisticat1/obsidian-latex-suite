import { Snippet } from "../snippets/snippets";
import { Environment } from "../snippets/environment";
import { DEFAULT_SNIPPETS } from "src/utils/default_snippets";
import { DEFAULT_SNIPPET_VARIABLES } from "src/utils/default_snippet_variables";

interface LatexSuiteBasicSettings {
	snippetsEnabled: boolean;
	snippetsTrigger: "Tab" | " "
	suppressSnippetTriggerOnIME: boolean;
	removeSnippetWhitespace: boolean;
	autoDelete$: boolean;
	loadSnippetsFromFile: boolean;
	loadSnippetVariablesFromFile: boolean;
	snippetsFileLocation: string;
	snippetVariablesFileLocation: string;
	autofractionEnabled: boolean;
	concealEnabled: boolean;
	concealRevealTimeout: number;
	colorPairedBracketsEnabled: boolean;
	highlightCursorBracketsEnabled: boolean;
	mathPreviewEnabled: boolean;
	mathPreviewPositionIsAbove: boolean;
	autofractionSymbol: string;
	autofractionBreakingChars: string;
	matrixShortcutsEnabled: boolean;
	taboutEnabled: boolean;
	reverseTaboutEnabled: boolean;
	autoEnlargeBrackets: boolean;
	wordDelimiters: string;
}

/**
 * Settings that require further processing (e.g. conversion to an array) before being used.
 */
interface LatexSuiteRawSettings {
	autofractionExcludedEnvs: string;
	matrixShortcutsEnvNames: string;
	taboutOpeningSymbols: string;
	taboutClosingSymbols: string;
	taboutLeftCommands: string,
	taboutRightCommands: string,
	taboutDelimiters: string;
	autoEnlargeBracketsTriggers: string;
	forceMathLanguages: string;
}

interface LatexSuiteParsedSettings {
	autofractionExcludedEnvs: Environment[];
	matrixShortcutsEnvNames: string[];
	sortedTaboutOpeningSymbols: string[];
	sortedTaboutClosingSymbols: string[];
	sortedTaboutLeftCommands: string[];
	sortedTaboutRightCommands: string[];
	sortedTaboutDelimiters: string[];
	autoEnlargeBracketsTriggers: string[];
	forceMathLanguages: string[];
}

export type LatexSuitePluginSettings = {snippets: string, snippetVariables: string} & LatexSuiteBasicSettings & LatexSuiteRawSettings;
export type LatexSuiteCMSettings = {snippets: Snippet[]} & LatexSuiteBasicSettings & LatexSuiteParsedSettings;

export const DEFAULT_SETTINGS: LatexSuitePluginSettings = {
	snippets: DEFAULT_SNIPPETS,
	snippetVariables: DEFAULT_SNIPPET_VARIABLES,

	// Basic settings
	snippetsEnabled: true,
	snippetsTrigger: "Tab",
	suppressSnippetTriggerOnIME: true,
	removeSnippetWhitespace: true,
	autoDelete$: true,
	loadSnippetsFromFile: false,
	loadSnippetVariablesFromFile: false,
	snippetsFileLocation: "",
	snippetVariablesFileLocation: "",
	concealEnabled: false,
	concealRevealTimeout: 0,
	colorPairedBracketsEnabled: true,
	highlightCursorBracketsEnabled: true,
	mathPreviewEnabled: true,
	mathPreviewPositionIsAbove: true,
	autofractionEnabled: true,
	autofractionSymbol: "\\frac",
	autofractionBreakingChars: "+-=\t",
	matrixShortcutsEnabled: true,
	taboutEnabled: true,
	reverseTaboutEnabled: true,
	autoEnlargeBrackets: true,
	wordDelimiters: "., +-\\n\t:;!?\\/{}[]()=~$",

	// Raw settings
	autofractionExcludedEnvs:
	`[
		["^{", "}"],
		["\\\\pu{", "}"]
	]`,
	matrixShortcutsEnvNames: "pmatrix, cases, align, gather, bmatrix, Bmatrix, vmatrix, Vmatrix, array, matrix",
	taboutOpeningSymbols: "(, [, \\lbrack, \\{, \\lbrace, \\langle, \\lvert, \\lVert, \\lfloor, \\lceil, \\ulcorner, {",
	taboutClosingSymbols: "), ], \\rbrack, \\}, \\rbrace, \\rangle, \\rvert, \\rVert, \\rfloor, \\rceil, \\urcorner, }",
	taboutLeftCommands: "\\left, \\bigl, \\Bigl, \\biggl, \\Biggl",
	taboutRightCommands: "\\right, \\bigr, \\Bigr, \\biggr, \\Biggr",
	taboutDelimiters: "(, ), [, ], \\lbrack, \\rbrack, \\{, \\}, \\lbrace, \\rbrace, <, >, \\langle, \\rangle, \\lt, \\gt, |, \\vert, \\lvert, \\rvert, \\|, \\Vert, \\lVert, \\rVert, \\lfloor, \\rfloor, \\lceil, \\rceil, \\ulcorner, \\urcorner, /, \\\\, \\backslash, \\uparrow, \\downarrow, \\Uparrow, \\Downarrow, .",
	autoEnlargeBracketsTriggers: "sum, int, frac, prod, bigcup, bigcap",
	forceMathLanguages: "math",
}

export function processLatexSuiteSettings(snippets: Snippet[], settings: LatexSuitePluginSettings):LatexSuiteCMSettings {

	function strToArray(str: string) {
		return str.replace(/\s/g,"").split(",");
	}

	function getAutofractionExcludedEnvs(envsStr: string) {
		let envs = [];

		try {
			const envsJSON = JSON.parse(envsStr);
			envs = envsJSON.map(function(env: string[]) {
				return {openSymbol: env[0], closeSymbol: env[1]};
			});
		}
		catch (e) {
			console.log(e);
		}

		return envs;
	}

	return {
		...settings,

		// Override raw settings with parsed settings
		snippets: snippets,
		autofractionExcludedEnvs: getAutofractionExcludedEnvs(settings.autofractionExcludedEnvs),
		matrixShortcutsEnvNames: strToArray(settings.matrixShortcutsEnvNames),
		sortedTaboutOpeningSymbols: strToArray(settings.taboutOpeningSymbols).sort((a, b) => b.length - a.length),
		sortedTaboutClosingSymbols: strToArray(settings.taboutClosingSymbols).sort((a, b) => b.length - a.length),
		sortedTaboutLeftCommands: strToArray(settings.taboutLeftCommands).sort((a, b) => b.length - a.length),
		sortedTaboutRightCommands: strToArray(settings.taboutRightCommands).sort((a, b) => b.length - a.length),
		sortedTaboutDelimiters: strToArray(settings.taboutDelimiters).sort((a, b) => b.length - a.length),
		autoEnlargeBracketsTriggers: strToArray(settings.autoEnlargeBracketsTriggers),
		forceMathLanguages: strToArray(settings.forceMathLanguages),
	}
}
