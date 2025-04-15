import { Snippet } from "../snippets/snippets";
import { Environment } from "../snippets/environment";
import { DEFAULT_SNIPPETS } from "src/utils/default_snippets";
import { DEFAULT_SNIPPET_VARIABLES } from "src/utils/default_snippet_variables";
import { DEFAULT_SYMBOL_GROUPS } from "src/utils/default_symbol_groups";
import { type SymbolGroups } from "src/snippets/parse";

interface LatexSuiteBasicSettings {
	snippetsEnabled: boolean;
	snippetsTrigger: "Tab" | " "
	suppressSnippetTriggerOnIME: boolean;
	removeSnippetWhitespace: boolean;
	autoDelete$: boolean;
	loadSnippetsFromFile: boolean;
	loadSnippetVariablesFromFile: boolean;
	loadSymbolGroupsFromFile: boolean;
	snippetsFileLocation: string;
	snippetVariablesFileLocation: string;
	symbolGroupsFileLocation: string;
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
	autoEnlargeBrackets: boolean;
	wordDelimiters: string;
}

/**
 * Settings that require further processing (e.g. conversion to an array) before being used.
 */
interface LatexSuiteRawSettings {
	autofractionExcludedEnvs: string;
	matrixShortcutsEnvNames: string;
	autoEnlargeBracketsTriggers: string;
	forceMathLanguages: string;
	autofractionIncludedSymbols: string;
}

interface LatexSuiteParsedSettings {
	autofractionExcludedEnvs: Environment[];
	matrixShortcutsEnvNames: string[];
	autoEnlargeBracketsTriggers: string[];
	forceMathLanguages: string[];
	autofractionIncludedSymbols: string;
}

export type LatexSuitePluginSettings = {snippets: string, snippetVariables: string, symbolGroups: string} & LatexSuiteBasicSettings & LatexSuiteRawSettings;
export type LatexSuiteCMSettings = {snippets: Snippet[]} & LatexSuiteBasicSettings & LatexSuiteParsedSettings;

export const DEFAULT_SETTINGS: LatexSuitePluginSettings = {
	snippets: DEFAULT_SNIPPETS,
	snippetVariables: DEFAULT_SNIPPET_VARIABLES,
	symbolGroups: DEFAULT_SYMBOL_GROUPS,

	// Basic settings
	snippetsEnabled: true,
	snippetsTrigger: "Tab",
	suppressSnippetTriggerOnIME: true,
	removeSnippetWhitespace: true,
	autoDelete$: true,
	loadSnippetsFromFile: false,
	loadSnippetVariablesFromFile: false,
	loadSymbolGroupsFromFile: false,
	snippetsFileLocation: "",
	snippetVariablesFileLocation: "",
	symbolGroupsFileLocation: "",
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
	autoEnlargeBrackets: true,
	wordDelimiters: "., +-\\n\t:;!?\\/{}[]()=~$",

	// Raw settings
	autofractionExcludedEnvs:
	`[
		["^{", "}"],
		["\\\\pu{", "}"]
	]`,
	matrixShortcutsEnvNames: "pmatrix, cases, align, gather, bmatrix, Bmatrix, vmatrix, Vmatrix, array, matrix",
	autoEnlargeBracketsTriggers: "sum, int, frac, prod, bigcup, bigcap",
	forceMathLanguages: "math",
	autofractionIncludedSymbols: "{GREEK}|{SYMBOLS}",
}


export function processLatexSuiteSettings(snippets: Snippet[], settings: LatexSuitePluginSettings, symbolGroups: SymbolGroups):LatexSuiteCMSettings {
	
	
	function strToArray(str: string) {
		return str.replace(/\s/g,"").split(",");
	}

	function insertSymbolGroups(setting: string) {
		for (const [group, replacement] of Object.entries(symbolGroups)) {
			setting = setting.replaceAll(group, replacement);
		}

		return setting;
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
			console.log("Catched error:\n", e);
		}

		return envs;
	}

	return {
		...settings,

		// Override raw settings with parsed settings
		snippets: snippets,
		autofractionExcludedEnvs: getAutofractionExcludedEnvs(settings.autofractionExcludedEnvs),
		matrixShortcutsEnvNames: strToArray(settings.matrixShortcutsEnvNames),
		autoEnlargeBracketsTriggers: strToArray(settings.autoEnlargeBracketsTriggers),
		forceMathLanguages: strToArray(settings.forceMathLanguages),
		autofractionIncludedSymbols: insertSymbolGroups(settings.autofractionIncludedSymbols),
	}
}
