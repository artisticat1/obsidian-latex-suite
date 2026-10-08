import { Snippet } from "../snippets/snippets";
import type { Environment } from "../snippets/environment";
import { DEFAULT_SNIPPETS } from "src/utils/default_snippets";
import { DEFAULT_SNIPPET_VARIABLES } from "src/utils/default_snippet_variables";
import * as v from "valibot";
import type { SnippetVariables } from "src/snippets/parse";
import { EMPTY_MAPPING, fullMappingSchema, MappingSchema, type RawConcealMapping } from "src/editor_extensions/conceal_maps";
import { createMacroMap, type MappingInfo } from "src/editor_extensions/conceal_fns";
import { DEFAULT_MATHLESS_ARGS, EMPTY_MATHLESS_ARGS, mathlessArgsSchema, restrictedMacroArgs, textMacroArgs, type MacroArgs } from "src/editor_context/default_text_areas";
import type { UpdateHandler } from "src/api";

export type snippetDebugLevel = "off" | "info" | "verbose";

type CMKeyMap = string;
type VimKeyMap = string;

export interface LatexSuiteBasicSettings {
	snippetsEnabled: boolean;
	suppressSnippetTriggerOnIME: boolean;
	suppressIMEWarning: boolean;
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
	mathPreviewCursor: string;
	mathPreviewBracketHighlighting: boolean;
	mathPreviewLivePreviewDisplay: boolean;
	autofractionSymbol: string;
	autofractionBreakingChars: string;
	matrixShortcutsEnabled: boolean;
	taboutEnabled: boolean;
	taboutExitEquationOnlyOnEOL: boolean;
	autoEnlargeBrackets: boolean;
	autoEnlargeBracketsSpace: boolean;
	wordDelimiters: string;
	snippetDebug: snippetDebugLevel;
	vimEnabled: boolean;
	vimSelectMode: VimKeyMap;
	vimVisualMode: VimKeyMap;
	vimMatrixEnter: VimKeyMap;
	snippetRecursion: number;
	snippetIMEVersion: boolean;
	highlightDollarEnabled: boolean;
	excalidrawSupportEnabled: boolean;
	logLevel: "off" | "info" | "verbose" | "vverbose";
}

/** triggers following the same format as https://codemirror.net/docs/ref/#view.KeyBinding */
export interface LatexSuiteCMKeymapSettings {
	snippetsTrigger: CMKeyMap;
	snippetNextTabstopTrigger: CMKeyMap;
	snippetPreviousTabstopTrigger: CMKeyMap;
	taboutTrigger: CMKeyMap;
	matrixShortcutsNewlineTrigger: CMKeyMap
	matrixShortcutsCellTrigger: CMKeyMap
	matrixShortcutsExitTrigger: CMKeyMap
	autofractionTrigger: CMKeyMap
}

/**
 * Settings that require further processing (e.g. conversion to an array) before being used.
 */
export interface LatexSuiteRawSettings {
	autofractionExcludedEnvs: string;
	matrixShortcutsEnvNames: string;
	matrixShortcutsMacroNames: string;
	taboutClosingSymbols: string;
	autoEnlargeBracketsTriggers: string;
	forceMathLanguages: string;
}

interface LatexSuiteParsedSettings {
	autofractionExcludedEnvs: Environment[];
	matrixShortcutsEnvNames: string[];
	matrixShortcutsMacroNames: string[];
	taboutClosingSymbols: Set<string>;
	autoEnlargeBracketsTriggers: string[];
	forceMathLanguages: string[];
}

interface LatexSuiteRawSchemaSettings {
	snippets: string;
	snippetVariables: string;
	concealMaps: string;
	textMacros: string;
}

export interface LatexSuiteParsedSchemaSettings {
	snippets: Snippet[];
	snippetVariables: SnippetVariables;
	rawConcealMaps: RawConcealMapping[];
	updateHandlers: UpdateHandler[];
}

type MathlessMacros = {
	text: MacroArgs[];
	restricted: MacroArgs[];
	all: (MacroArgs & { kind: "text" | "restricted" })[];
};

interface LatexSuiteProcessedSchemaSettings {
	snippets: GroupedSnippets;
	snippetVariables: SnippetVariables;
	concealMaps: MappingInfo;
	mathlessMacros: MathlessMacros;
	updateHandlers: UpdateHandler[];
}

export type GroupedSnippets = {
	automatic: Snippet[];
	all: Snippet[];
};

export type LatexSuitePluginSettings = LatexSuiteRawSchemaSettings &
	LatexSuiteBasicSettings &
	LatexSuiteRawSettings &
	LatexSuiteCMKeymapSettings;
export type LatexSuiteCMSettings = LatexSuiteProcessedSchemaSettings &
	LatexSuiteBasicSettings &
	LatexSuiteParsedSettings &
	LatexSuiteCMKeymapSettings;

export const DEFAULT_SETTINGS: LatexSuitePluginSettings = {
	snippets: DEFAULT_SNIPPETS,
	snippetVariables: DEFAULT_SNIPPET_VARIABLES,

	// Basic settings
	snippetsEnabled: true,
	snippetsTrigger: "Tab",
	snippetNextTabstopTrigger: "Tab",
	snippetPreviousTabstopTrigger: "Shift-Tab",
	suppressSnippetTriggerOnIME: true,
	suppressIMEWarning: false,
	removeSnippetWhitespace: true,
	autoDelete$: true,
	loadSnippetsFromFile: false,
	loadSnippetVariablesFromFile: false,
	snippetsFileLocation: "",
	snippetVariablesFileLocation: "",
	concealEnabled: false,
	concealRevealTimeout: 0,
	concealMaps: JSON.stringify(EMPTY_MAPPING, null, "\t"),
	colorPairedBracketsEnabled: true,
	highlightCursorBracketsEnabled: true,
	mathPreviewEnabled: true,
	mathPreviewPositionIsAbove: true,
	mathPreviewCursor: "▶",
	mathPreviewBracketHighlighting: false,
	mathPreviewLivePreviewDisplay: false,
	autofractionEnabled: true,
	autofractionSymbol: "\\frac",
	autofractionBreakingChars: "+-=\t",
	matrixShortcutsEnabled: true,
	taboutEnabled: true,
	taboutExitEquationOnlyOnEOL: true,
	taboutTrigger: "Tab",
	autoEnlargeBrackets: true,
	autoEnlargeBracketsSpace: true,
	wordDelimiters: "., +-\\n\t:;!?\\/{}[]()=~$'\"|`<>*^%#@&",

	// Raw settings
	autofractionExcludedEnvs: `[
		["^{", "}"],
		["\\\\pu{", "}"]
	]`,
	matrixShortcutsEnvNames:
		"pmatrix, cases, align, gather, bmatrix, Bmatrix, vmatrix, Vmatrix, array, matrix, aligned",
	matrixShortcutsMacroNames: "eqalign",
	taboutClosingSymbols:
		"), ], \\rbrack, \\}, \\rbrace, \\rangle, \\rvert, \\rVert, \\rfloor, \\rceil, \\urcorner, }",
	autoEnlargeBracketsTriggers: "sum, int, frac, prod, bigcup, bigcap",
	forceMathLanguages: "math",
	snippetDebug: "off",
	vimEnabled: false,
	vimSelectMode: "<C-g>",
	vimVisualMode: "<C-g>",
	vimMatrixEnter: "o",
	snippetRecursion: 0,
	snippetIMEVersion: false,
	highlightDollarEnabled: true,
	excalidrawSupportEnabled: true,
	logLevel: "off",
	autofractionTrigger: "/",
	matrixShortcutsCellTrigger: "Tab",
	matrixShortcutsNewlineTrigger: "Enter",
	matrixShortcutsExitTrigger: "Shift-Enter",
	textMacros: JSON.stringify(DEFAULT_MATHLESS_ARGS, null, "\t"),
};

export const EnvironmentSchema = v.pipe(
	v.string(),
	v.parseJson(),
	v.array(
		v.looseTuple(
			[v.string(), v.string()],
			"Every item needs to be an array with 2 items",
		),
		"Needs to be an array [item1,item2]",
	),
	v.mapItems(([openSymbol, closeSymbol]) => ({ openSymbol, closeSymbol })),
);

export function validateTextMacros(textMacros: string) {
	return v.safeParse(
		v.pipe(
			v.string(),
			v.parseJson(),
			v.check((obj) => !Array.isArray(obj), "Expected an object with 'text' and 'restricted' properties, but got an array."),
			mathlessArgsSchema,
		),
		textMacros,
	);
}


export function processLatexSuiteSettings(
	settings: LatexSuitePluginSettings,
	{ snippets, snippetVariables, rawConcealMaps, updateHandlers }: LatexSuiteParsedSchemaSettings,
): LatexSuiteCMSettings {
	function strToArray(str: string) {
		return str.replace(/\s/g, "").split(",");
	}

	function getAutofractionExcludedEnvs(envsStr: string) {
		let envs: Environment[] = [];

		try {
			envs = v.parse(EnvironmentSchema, envsStr);
		} catch (e) {
			console.error(e);
		}

		return envs;
	}
	function getConcealMaps(concealMapsStr: string): RawConcealMapping {
		const schema = v.pipe(
			v.string(), v.parseJson(), MappingSchema
		)
		try {
			return v.parse(schema, concealMapsStr);
		} catch (e) {
			console.error(e);
			return EMPTY_MAPPING;
		}
	}
	function getMacroAreasFromString(str: string) {
		const result = validateTextMacros(str);
		if (!result.success) {
			console.error("Failed to parse textMacros/snippetlessMacros", result.issues);
		}
		const data = result.success ? result.output : EMPTY_MATHLESS_ARGS;
		return {
			text: [...data.text, ...textMacroArgs],
			restricted: [...data.restricted, ...restrictedMacroArgs],	
		}

	}
	const groupedSnippets = {
		automatic: snippets.filter((s) => s.options.automatic),
		all: snippets,
	};
	

	const concatenatedMaps = [...rawConcealMaps, getConcealMaps(settings.concealMaps)];
	const concealMaps = fullMappingSchema(concatenatedMaps);
	const mappingInfo = {
		maps: concealMaps,
		macroMap: createMacroMap(concealMaps),
	}
	
	const textMacros = getMacroAreasFromString(settings.textMacros);
	const mathlessMacros: MathlessMacros = {
		text: textMacros.text,
		restricted: textMacros.restricted,
		all: [
			...textMacros.text.map((m) => ({ ...m, kind: "text" } as const)),
			...textMacros.restricted.map((m) => ({ ...m, kind: "restricted" } as const)),
		],
	};

	return {
		...settings,
		snippetVariables,

		updateHandlers,
		// Override raw settings with parsed settings
		snippets: groupedSnippets,
		concealMaps: mappingInfo,
		autofractionExcludedEnvs: getAutofractionExcludedEnvs(
			settings.autofractionExcludedEnvs,
		),
		matrixShortcutsEnvNames: strToArray(settings.matrixShortcutsEnvNames),
		matrixShortcutsMacroNames: strToArray(
			settings.matrixShortcutsMacroNames,
		),
		taboutClosingSymbols: new Set<string>(
			strToArray(settings.taboutClosingSymbols),
		),
		// Add backslash to triggers that are LaTeX commands
		autoEnlargeBracketsTriggers: strToArray(
			settings.autoEnlargeBracketsTriggers,
		).map((trigger) =>
			/[A-Za-z]+/.test(trigger) ? `\\${trigger}` : trigger,
		),
		forceMathLanguages: strToArray(settings.forceMathLanguages),
		mathlessMacros: mathlessMacros,
	};
}

export function isLogLevelEnabled(
	currentLevel: LatexSuiteBasicSettings["logLevel"],
	messageLevel: LatexSuiteBasicSettings["logLevel"],
): boolean {
	if (currentLevel === "off") {
		return false;
	}
	const currentLevelNum = convertLogLevelToNumber(currentLevel);
	const messageLevelNum = convertLogLevelToNumber(messageLevel);

	return messageLevelNum <= currentLevelNum;
}

export function convertLogLevelToNumber(level: LatexSuiteBasicSettings["logLevel"]): number {
	switch (level) {
		case "off":
			return 0;
		case "info":
			return 1;
		case "verbose":
			return 2;
		case "vverbose":
			return 3;
	}
}
