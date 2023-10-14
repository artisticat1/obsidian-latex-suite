import { DEFAULT_SNIPPETS } from "../default_snippets";
import { Environment, ParsedSnippet } from "../snippets/snippets";

export interface LatexSuiteBasicSetting {
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
 * A setting that requires further processing (e.g. conversion to an array) before being used.
 */
export interface LatexSuiteRawSetting {
	autofractionExcludedEnvs: string;
	matrixShortcutsEnvNames: string;
	autoEnlargeBracketsTriggers: string;
	forceMathLanguages: string;
	snippetVariables: string;
}

export interface LatexSuiteParsedSetting {
	autofractionExcludedEnvs: Environment[];
	matrixShortcutsEnvNames: string[];
	autoEnlargeBracketsTriggers: string[];
	forceMathLanguages: string[];
	snippetVariables: {[key: string]: string};
}

export interface LatexSuiteSettings {
	snippets: string;
	basicSettings: LatexSuiteBasicSetting;
	rawSettings: LatexSuiteRawSetting;
}

export interface LatexSuiteProcessedSettings {
	snippets: ParsedSnippet[];
	basicSettings: LatexSuiteBasicSetting;
	parsedSettings: LatexSuiteParsedSetting;
}

export const DEFAULT_SETTINGS: LatexSuiteSettings = {
	snippets: DEFAULT_SNIPPETS,
	basicSettings: {
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
	},
	rawSettings: {
		autofractionExcludedEnvs:
		`[
			["^{", "}"],
			["\\\\pu{", "}"]
		]`,
		matrixShortcutsEnvNames: "pmatrix, cases, align, bmatrix, Bmatrix, vmatrix, Vmatrix, array, matrix",
		autoEnlargeBracketsTriggers: "sum, int, frac, prod",
		forceMathLanguages: "math",
		snippetVariables: `{
	"$\{GREEK}": "alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|varphi|phi|Phi|chi|psi|Psi|omega|Omega",
    "$\{SYMBOL}": "hbar|ell|nabla|infty|dots|leftrightarrow|mapsto|setminus|mid|cap|cup|land|lor|subseteq|subset|implies|impliedby|iff|exists|equiv|square|neq|geq|leq|gg|ll|sim|simeq|approx|propto|cdot|oplus|otimes|times|star|perp|det|exp|ln|log|partial",
    "$\{SHORT_SYMBOL}": "to|pm|mp"
}`,
	},
}

export function processLatexSuiteSettings(snippets: ParsedSnippet[], settings: LatexSuiteSettings):LatexSuiteProcessedSettings {
	const raw = settings.rawSettings;

	function strToArray(str: string) {
		return str.replace(/\s/g,"").split(",");
	}

	function getAutofractionExcludedEnvs(envsStr: string) {
		const envsJSON = JSON.parse(envsStr);
		const envs = envsJSON.map(function(env: string[]) {
			return {openSymbol: env[0], closeSymbol: env[1]};
		});

		return envs;
	}

	return {
		snippets: snippets,
		basicSettings: settings.basicSettings,
		parsedSettings: {
			autofractionExcludedEnvs: getAutofractionExcludedEnvs(raw.autofractionExcludedEnvs),
			matrixShortcutsEnvNames: strToArray(raw.matrixShortcutsEnvNames),
			autoEnlargeBracketsTriggers: strToArray(raw.autoEnlargeBracketsTriggers),
			forceMathLanguages: strToArray(raw.forceMathLanguages),
			snippetVariables: JSON.parse(settings.rawSettings.snippetVariables),
		},
	}
}
