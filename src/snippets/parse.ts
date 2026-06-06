import { optional, object, string as string_, union, parse, number, InferOutput as Output, custom, instance, array, pipe, transform } from "valibot";
import { RegexSnippet, serializeSnippetLike, Snippet, StringSnippet, VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER, VisualSnippet } from "./snippets";
import { Options } from "./options";
import { sortSnippets } from "./sort";
import { EXCLUSIONS, Environment } from "./environment";
import { Platform } from "obsidian";
import { api } from "./luasnip_api";
import { ArrayNode, BaseNode, SnippetStringNode, SnippetTabstopOnlyNode, VisualSnippetNode } from "./luasnip_api/node";

export type SnippetVariables = Record<string, string>;

function importModule(source: string, identifier: string): Promise<object> {
	const sourceWithSourceURL = `${source}\n//# sourceURL=latex-suite:${identifier}`;
	const blob = new Blob([sourceWithSourceURL], { type: "text/javascript" });
	const url = URL.createObjectURL(blob);
	// eslint-disable-next-line no-unsanitized/method
	const result = import(url);
	URL.revokeObjectURL(url);
	return result;
}

async function importRaw(module: string, identifier: string): Promise<unknown> {
	let data: object;
	try {
		data = await importModule(module, identifier);
	} catch (e) {
		console.error(e)
		try {
		data = await importModule("export default " + module, identifier);
		} catch (e) {
			console.error(e)
			throw new Error("Invalid format");
		}
	}
	if ("default" in data) {
		return data.default;
	} else {
		throw new Error("No default export found");
	}
}

export async function parseSnippetVariables(snippetVariablesStr: string, identifier: string) {
	const rawSnippetVariables = await importRaw(snippetVariablesStr, identifier) as SnippetVariables;

	if (Array.isArray(rawSnippetVariables))
		throw new Error("Cannot parse an array as a variables object");

	const snippetVariables: SnippetVariables = {};
	for (const [variable, value] of Object.entries(rawSnippetVariables)) {
		if (variable.startsWith("${")) {
			if (!variable.endsWith("}")) {
				throw new Error(`Invalid snippet variable name '${variable}': Starts with '\${' but does not end with '}'. You need to have both or neither.`);
			}
			snippetVariables[variable] = value;
		} else {
			if (variable.endsWith("}")) {
				throw new Error(`Invalid snippet variable name '${variable}': Ends with '}' but does not start with '\${'. You need to have both or neither.`);
			}
			snippetVariables["${" + variable + "}"] = value;
		}
	}
	return snippetVariables;
}
const preamble = String.raw`
var __latex_suite_require = window.__latex_suite_require;
function require(module) {
	if (!__latex_suite_require) {
		__latex_suite_require = window.__latex_suite_require;
	}
	return __latex_suite_require(module);
}
`

function latex_suite_require(default_snippets: SnippetVariables) {
	const parsed_api = api(default_snippets);
	return (module: string): unknown => {
		if (module === "latex-suite") {
			return parsed_api
		} else {
			return require(module)
		}
	}
}

declare global {
	var __latex_suite_require: ReturnType<typeof latex_suite_require>;
}

export async function parseSnippets(snippetsStr: string, snippetVariables: SnippetVariables, identifier: string) {
	window.__latex_suite_require = latex_suite_require(snippetVariables);
	const rawSnippets = await importRaw(snippetsStr + preamble, identifier);

	let parsedSnippets;
	try {
		// validate the shape of the raw snippets
		const rawValidatedSnippets = validateRawSnippets(rawSnippets);

		parsedSnippets = rawValidatedSnippets.map((raw) => {
			try {
				// Normalize the raw snippet and convert it into a Snippet
				return parseSnippet(raw, snippetVariables);
			} catch (e) {
				// provide context of which snippet errored
				throw new Error(`${e}\nErroring snippet:\n${serializeSnippetLike(raw)}`);
			}
		});
	} catch(e) {
		throw new Error(`Invalid snippet format: ${e}`);
	}

	parsedSnippets = sortSnippets(parsedSnippets);

	return parsedSnippets;
}

/** raw snippet IR */

const RawSnippetSchema = object({
	trigger: union([string_(), instance(RegExp)]),
	triggerAfter: optional(union([string_(), instance(RegExp)])),
	replacement: union([
		string_(),
		pipe(
			array(instance(BaseNode)),
			transform((nodes) => new ArrayNode(nodes)),
		),
		custom<AnyFunction>((x) => typeof x === "function"),
	]),
	options: string_(),
	flags: optional(string_(), ""),
	priority: optional(number(), 0),
	description: optional(string_(), "no description provided"),
	triggerKey: optional(string_(), ""),
	language: optional(string_()),
	excludedEnvs: pipe(
		optional(
			object({
				matrix: optional(array(string_()), []),
				macros: optional(array(string_()), []),
			}),
			{},
		),
		transform(({ matrix, macros }): Environment[] => [
			...matrix.map((env) => ({
				openSymbol: `\\begin{${env}}`,
				closeSymbol: `\\end{${env}}`,
			})),
			...macros.map((env) => ({
				openSymbol: `\\${env}{`,
				closeSymbol: "}",
			})),
		]),
	),
});

type RawSnippet = Output<typeof RawSnippetSchema>;

/**
 * tries to parse an unknown value as an array of raw snippets
 * @throws if the value does not adhere to the raw snippet array schema
 */
function validateRawSnippets(snippets: unknown): RawSnippet[] {
	if (!Array.isArray(snippets)) { throw new Error("Expected snippets to be an array"); }
	return snippets.flat().map((raw) => {
		try {
			return parse(RawSnippetSchema, raw);
		} catch {
			throw new Error(`Value does not resemble snippet.\nErroring snippet:\n${serializeSnippetLike(raw)}`);
		}
	})
}

/**
 * Parses a raw snippet.
 * This does the following:
 * - snippet variables are substituted into the trigger
 * - `options.regex` and `options.visual` are set properly
 * - if it is a regex snippet, the trigger is represented as a RegExp instance with flags set
 */
function parseSnippet(raw: RawSnippet, snippetVariables: SnippetVariables): Snippet {
	const { replacement: replacementRaw, priority, description, excludedEnvs: userExcludedEnvironments } = raw;
	const options = Options.fromSource(raw.options, raw.language);
	const triggerKey = parseKeyName(raw.triggerKey);

	// we have a regex snippet
	if (options.regex || raw.trigger instanceof RegExp) {
		const replacement =
			typeof raw.replacement === "string"
				? new ArrayNode([new SnippetStringNode(raw.replacement)])
				: raw.replacement;
		let triggerStr: string;
		let triggerAfterStr: string | undefined;
		// normalize flags to a string
		let flags = raw.flags;
		let triggerAfterFlags = flags;

		// extract trigger string from trigger,
		// and merge flags, if trigger is a regexp already
		if (raw.trigger instanceof RegExp) {
			triggerStr = raw.trigger.source;
			flags = `${raw.trigger.flags}${flags}`;
		} else {
			triggerStr = raw.trigger;
		}
		if (raw.triggerAfter instanceof RegExp) {
			triggerAfterStr = raw.triggerAfter.source;
			triggerAfterFlags = `${raw.triggerAfter.flags}${triggerAfterFlags}`;
		} else {
			triggerAfterStr = raw.triggerAfter;
		}
		// filter out invalid flags
		flags = filterFlags(flags);
		triggerAfterFlags = filterFlags(triggerAfterFlags);

		// substitute snippet variables
		triggerStr = insertSnippetVariables(triggerStr, snippetVariables);
		triggerAfterStr = triggerAfterStr && insertSnippetVariables(triggerAfterStr, snippetVariables);

		// get excluded environment(s) for this trigger, if any
		const excludedEnvironments = [...getExcludedEnvironments(triggerStr), ...userExcludedEnvironments];

		// Add $ so regex matches end of string
		// i.e. look for a match at the cursor's current position
		triggerStr = `(?:${triggerStr})$`;

		// allow inheritance/ fake/custom RegExp such as pcre2 regex (regex++ package).
		const TriggerRegExpConstructor =
			typeof raw.trigger === "string"
				? RegExp
				: (raw.trigger.constructor as typeof RegExp);
		const AfterTriggerRegExpConstructor =
			typeof raw.triggerAfter === "string" || raw.triggerAfter === undefined
				? RegExp
				: (raw.triggerAfter.constructor as typeof RegExp);

		// convert trigger into RegExp instance
		const trigger = new TriggerRegExpConstructor(triggerStr, flags);
		// Add ^ to triggerAfter so it matches the start of the string
		triggerAfterStr = triggerAfterStr ? `^(?:${triggerAfterStr})` : undefined;
		const triggerAfter = triggerAfterStr
			? new AfterTriggerRegExpConstructor(
					triggerAfterStr,
					triggerAfterFlags,
				)
			: undefined;

		options.regex = true;

		const normalised = { trigger, replacement, options, priority, description, excludedEnvironments, triggerKey, triggerAfter };

		return new RegexSnippet(normalised);
	}
	else {
		// substitute snippet variables
		const trigger = insertSnippetVariables(raw.trigger, snippetVariables);

		let triggerAfter = raw.triggerAfter;
		if (triggerAfter !== undefined && typeof triggerAfter === "string") {
			triggerAfter = insertSnippetVariables(triggerAfter, snippetVariables);
		} else if (triggerAfter instanceof RegExp) {
			throw new Error("triggerAfter cannot be a RegExp for non-regex snippets");
		}

		// get excluded environment(s) for this trigger, if any
		const excludedEnvironments = [...getExcludedEnvironments(trigger), ...userExcludedEnvironments];

		// normalize visual replacements
		if (typeof replacementRaw === "string" && replacementRaw.includes(VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER)) {
			options.visual = true;
		}


		if (options.visual) {
			const replacement =
				typeof raw.replacement === "string"
					? new ArrayNode([new VisualSnippetNode(raw.replacement)])
					: raw.replacement;
			const normalised = { trigger, replacement, options, priority, description, excludedEnvironments, triggerKey, triggerAfter };
			return new VisualSnippet(normalised);
		}
		else {
			const replacement =
				typeof raw.replacement === "string"
					? new ArrayNode([new SnippetTabstopOnlyNode(raw.replacement)])
					: raw.replacement;
			const normalised = { trigger, replacement, options, priority, description, excludedEnvironments, triggerKey, triggerAfter };
			return new StringSnippet(normalised);
		}
	}
}

/**
 * removes duplicate flags and filters out invalid ones from a flags string.
 */
function filterFlags(flags: string): string {
	// filter out invalid flags
	const validFlags = [
		// "d", // doesn't affect the search
		// "g", // doesn't affect the pattern match and is almost certainly undesired behavior
		"i",
		"m",
		"s",
		"u",
		"v",
		// "y", // almost certainly undesired behavior
	];
	return Array.from(new Set(flags.split("")))
			.filter(flag => validFlags.includes(flag))
			.join("");
}

function insertSnippetVariables(trigger: string, variables: SnippetVariables) {
	for (const [variable, replacement] of Object.entries(variables)) {
		trigger = trigger.replaceAll(variable, replacement);
	}

	return trigger;
}

function getExcludedEnvironments(trigger: string): Environment[] {
	const result = [];
	if (trigger in EXCLUSIONS) {
		result.push(...EXCLUSIONS[trigger]);
	}
	return result;
}

export function parseKeyName(name: string): string {
	return name.split(/ (?!$)/).map(part => normalizeKeyName(part)).join(" ");
}

function normalizeKeyName(name: string) {
	const parts = name.split(/-(?!$)/);
	let result = parts[parts.length - 1];
	if (result === "Space") result = " ";
	let alt, ctrl, shift, meta;
	for (let i = 0; i < parts.length - 1; ++i) {
		const mod = parts[i];
		if (/^(cmd|meta|m)$/i.test(mod)) meta = true;
		else if (/^a(lt)?$/i.test(mod)) alt = true;
		else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true;
		else if (/^s(hift)?$/i.test(mod)) shift = true;
		else if (/^mod$/i.test(mod)) {
			if (Platform.isMacOS) meta = true;
			else ctrl = true;
		} else throw new Error("Unrecognized modifier name: " + mod);
	}
	if (alt) result = "Alt-" + result;
	if (ctrl) result = "Ctrl-" + result;
	if (meta) result = "Meta-" + result;
	if (shift) result = "Shift-" + result;
	return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn<Args extends readonly any[], Ret> = (...args: Args) => Ret;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = Fn<any, any>;
