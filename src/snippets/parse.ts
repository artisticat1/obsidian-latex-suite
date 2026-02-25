import { optional, object, string as string_, union, instance, parse, number, Output, special } from "valibot";
import { encode } from "js-base64";
import { RegexSnippet, serializeSnippetLike, Snippet, StringSnippet, VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER, VisualSnippet } from "./snippets";
import { Options } from "./options";
import { sortSnippets } from "./sort";
import { EXCLUSIONS, Environment } from "./environment";
import { Platform } from "obsidian";

export type SnippetVariables = Record<string, string>;

async function importRaw(maybeJavaScriptCode: string) {
	let raw;
	try {
		try {
			// first, try to import as a plain js module
			// js-base64.encode is needed over builtin `window.btoa` because the latter errors on unicode
			raw = await importModuleDefault(`data:text/javascript;base64,${encode(maybeJavaScriptCode)}`);
		} catch {
			// otherwise, try to import as a standalone js object
			raw = await importModuleDefault(`data:text/javascript;base64,${encode(`export default ${maybeJavaScriptCode}`)}`);
		}
	} catch {
		throw `Invalid format`;
	}
	return raw;
}

export async function parseSnippetVariables(snippetVariablesStr: string) {
	const rawSnippetVariables = await importRaw(snippetVariablesStr) as SnippetVariables;

	if (Array.isArray(rawSnippetVariables))
		throw "Cannot parse an array as a variables object";

	const snippetVariables: SnippetVariables = {};
	for (const [variable, value] of Object.entries(rawSnippetVariables)) {
		if (variable.startsWith("${")) {
			if (!variable.endsWith("}")) {
				throw `Invalid snippet variable name '${variable}': Starts with '\${' but does not end with '}'. You need to have both or neither.`;
			}
			snippetVariables[variable] = value;
		} else {
			if (variable.endsWith("}")) {
				throw `Invalid snippet variable name '${variable}': Ends with '}' but does not start with '\${'. You need to have both or neither.`;
			}
			snippetVariables["${" + variable + "}"] = value;
		}
	}
	return snippetVariables;
}

export async function parseSnippets(snippetsStr: string, snippetVariables: SnippetVariables) {
	const rawSnippets = await importRaw(snippetsStr);

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
				throw `${e}\nErroring snippet:\n${serializeSnippetLike(raw)}`;
			}
		});
	} catch(e) {
		throw `Invalid snippet format: ${e}`;
	}

	parsedSnippets = sortSnippets(parsedSnippets);

	return parsedSnippets;
}

/** load snippet string as module */

/**
 * imports the default export of a given module.
 *
 * @param module the module to import. this can be a resource path, data url, etc
 * @returns the default export of said module
 * @throws if import fails or default export is undefined
 */
async function importModuleDefault(module: string): Promise<unknown> {
	let data;
	try {
		data = await import(module);
	} catch {
		throw `failed to import module ${module}`;
	}

	// it's safe to use `in` here - it has a null prototype, so `Object.hasOwnProperty` isn't available,
	// but on the other hand we don't need to worry about something further up the prototype chain messing with this check
	if (!("default" in data)) {
		throw `No default export provided for module ${module}`;
	}

	return data.default;
}

/** raw snippet IR */

const RawSnippetSchema = object({
	trigger: union([string_(), instance(RegExp)]),
	replacement: union([string_(), special<AnyFunction>(x => typeof x === "function")]),
	options: string_(),
	flags: optional(string_(), ""),
	priority: optional(number(), 0),
	description: optional(string_(), "no description provided"),
	triggerKey: optional(string_(), ""),
	language: optional(string_()),
});

type RawSnippet = Output<typeof RawSnippetSchema>;

/**
 * tries to parse an unknown value as an array of raw snippets
 * @throws if the value does not adhere to the raw snippet array schema
 */
function validateRawSnippets(snippets: unknown): RawSnippet[] {
	if (!Array.isArray(snippets)) { throw "Expected snippets to be an array"; }
	return snippets.flat().map((raw) => {
		try {
			return parse(RawSnippetSchema, raw);
		} catch (e) {
			throw `Value does not resemble snippet.\nErroring snippet:\n${serializeSnippetLike(raw)}`;
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
	const { replacement, priority, description } = raw;
	const options = Options.fromSource(raw.options, raw.language);
	let trigger;
	let excludedEnvironments;
	const triggerKey = parseKeyName(raw.triggerKey);

	// we have a regex snippet
	if (options.regex || raw.trigger instanceof RegExp) {
		let triggerStr: string;
		// normalize flags to a string
		let flags = raw.flags;

		// extract trigger string from trigger,
		// and merge flags, if trigger is a regexp already
		if (raw.trigger instanceof RegExp) {
			triggerStr = raw.trigger.source;
			flags = `${(raw.trigger as RegExp).flags}${flags}`;
		} else {
			triggerStr = raw.trigger;
		}
		// filter out invalid flags
		flags = filterFlags(flags);

		// substitute snippet variables
		triggerStr = insertSnippetVariables(triggerStr, snippetVariables);

		// get excluded environment(s) for this trigger, if any
		excludedEnvironments = getExcludedEnvironments(triggerStr);

		// Add $ so regex matches end of string
		// i.e. look for a match at the cursor's current position
		triggerStr = `(?:${triggerStr})$`;

		// convert trigger into RegExp instance
		trigger = new RegExp(triggerStr, flags);

		options.regex = true;

		const normalised = { trigger, replacement, options, priority, description, excludedEnvironments, triggerKey };

		return new RegexSnippet(normalised);
	}
	else {
		let trigger = raw.trigger as string;
		// substitute snippet variables
		trigger = insertSnippetVariables(trigger, snippetVariables);

		// get excluded environment(s) for this trigger, if any
		excludedEnvironments = getExcludedEnvironments(trigger);

		// normalize visual replacements
		if (typeof replacement === "string" && replacement.includes(VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER)) {
			options.visual = true;
		}

		const normalised = { trigger, replacement, options, priority, description, excludedEnvironments, triggerKey };

		if (options.visual) {
			return new VisualSnippet(normalised);
		}
		else {
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
	if (EXCLUSIONS.hasOwnProperty(trigger)) {
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
