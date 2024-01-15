import { Snippet } from "../snippets/snippets";
import { Environment } from "../snippets/environment";
import { getSnippetVariables } from "src/snippets/snippet_variables";
import { DEFAULT_SNIPPETS } from "src/utils/default_snippets";

interface LatexSuiteBasicSettings {
	snippetsEnabled: boolean;
	snippetsTrigger: "Tab" | " "
	removeSnippetWhitespace: boolean;
	loadSnippetsFromFile: boolean;
	snippetsFileLocation: string;
	autofractionEnabled: boolean;
	concealEnabled: boolean;
	colorPairedBracketsEnabled: boolean;
	highlightCursorBracketsEnabled: boolean;
	mathPreviewEnabled: boolean;
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
	snippetVariables: string;
}

interface LatexSuiteParsedSettings {
	autofractionExcludedEnvs: Environment[];
	matrixShortcutsEnvNames: string[];
	autoEnlargeBracketsTriggers: string[];
	forceMathLanguages: string[];
	snippetVariables: {[key: string]: string};
}

export type LatexSuitePluginSettings = {snippets: string} & LatexSuiteBasicSettings & LatexSuiteRawSettings;
export type LatexSuiteCMSettings = {snippets: Snippet[]} & LatexSuiteBasicSettings & LatexSuiteParsedSettings;

export const DEFAULT_SETTINGS: LatexSuitePluginSettings = {
	snippets: DEFAULT_SNIPPETS,

	// Basic settings
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
	matrixShortcutsEnvNames: "pmatrix, cases, align, bmatrix, Bmatrix, vmatrix, Vmatrix, array, matrix",
	autoEnlargeBracketsTriggers: "sum, int, frac, prod, bigcup, bigcap",
	forceMathLanguages: "math",
	snippetVariables: `{
	"$\{GREEK}": "alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|omicron|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|Upsilon|varphi|phi|Phi|chi|psi|Psi|omega|Omega",
	"$\{SYMBOL}": "hbar|ell|nabla|infty|dots|leftrightarrow|mapsto|setminus|mid|bigcap|bigcup|cap|cup|land|lor|subseteq|subset|implies|impliedby|iff|exists|forall|equiv|square|neq|geq|leq|gg|ll|sim|simeq|approx|propto|cdot|oplus|otimes|times|star|perp|det|exp|ln|log|partial",
	"$\{SHORT_SYMBOL}": "to|pm|mp"
}`
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
		autoEnlargeBracketsTriggers: strToArray(settings.autoEnlargeBracketsTriggers),
		forceMathLanguages: strToArray(settings.forceMathLanguages),
		snippetVariables: getSnippetVariables(settings.snippetVariables),

	}
}
