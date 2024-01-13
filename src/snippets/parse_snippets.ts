import { optional, object, string as string_, union, instance, parse, number, Output, special } from "valibot";
import { encode } from "js-base64";
import { RegexSnippet, serializeSnippetLike, Snippet, SnippetType, StringSnippet, VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER, VisualSnippet } from "./snippets";
import { Options } from "./options";
import { sortSnippets } from "./sort";
import type { SnippetVariables } from "./snippet_variables";
import { EXCLUSIONS, Environment } from "./environment";

export async function parseSnippets(snippetsStr: string, snippetVariables: SnippetVariables) {
	let rawSnippets;
	try {
		try {
			// first, try to import as a plain js module
			// js-base64.encode is needed over builtin `window.btoa` because the latter errors on unicode
			rawSnippets = await importModuleDefault(`data:text/javascript;base64,${encode(snippetsStr)}`);
		} catch {
			// otherwise, try to import as a standalone js array
			rawSnippets = await importModuleDefault(`data:text/javascript;base64,${encode(`export default ${snippetsStr}`)}`);
		}
	} catch (e) {
		throw "Invalid snippet format.";	
	}

	let parsedSnippets;
	try {
		// validate the shape of the raw snippets
		rawSnippets = validateRawSnippets(rawSnippets);
		
		parsedSnippets = rawSnippets.map((raw) => {
			try {
				// normalize the raw snippet
				const normalized = normalizeRawSnippet(raw, snippetVariables);
				// and convert it into a Snippet
				return parseSnippet(normalized);
			} catch (e) {
				// provide context of which snippet errored
				throw `${e}\nerroring snippet:\n${serializeSnippetLike(raw)}`;
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
	} catch (e) {
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
	flags: optional(string_()),
	priority: optional(number()),
	description: optional(string_()),
});

type RawSnippet = Output<typeof RawSnippetSchema>;

/**
 * tries to parse an unknown value as an array of raw snippets
 * @throws if the value does not adhere to the raw snippet array schema
 */
function validateRawSnippets(snippets: unknown): RawSnippet[] {
	if (!Array.isArray(snippets)) { throw "Expected snippets to be an array"; }
	return snippets.map((raw) => {
		try {
			return parse(RawSnippetSchema, raw);
		} catch (e) {
			throw `Value does not resemble snippet.\nerroring snippet:\n${serializeSnippetLike(raw)}`;
		}
	})
}

/** normalize raw snippets to a more consistent representation */

/**
 * the intermediate normalized raw snippet interface.
 * it makes parsing them into the final snippet representation easier.
 * 
 * a normalized raw snippet has the following guarantees:
 * - snippet variables are substituted into the trigger
 * - `options.regex` and `options.visual` are set properly
 * - if it is a regex snippet, the trigger is represented as a RegExp instance with flags set
 */
type NormalizedRawSnippet =
	| NormalizedRawStringOrVisualSnippet
	| NormalizedRawRegexSnippet

interface BaseNormalizedRawSnippet {
	trigger: string | RegExp;
	replacement: string | AnyFunction;
	options: Options;
	priority?: number;
	description?: string;
	excludedEnvironments: Environment[] | null;
}

interface NormalizedRawStringOrVisualSnippet extends BaseNormalizedRawSnippet {
	trigger: string;
	replacement: string | AnyFunction;
	// flags: string;
}

interface NormalizedRawRegexSnippet extends BaseNormalizedRawSnippet {
	trigger: RegExp;
	replacement: string | AnyFunction;
}

/**
 * "normalizes" a raw snippet.
 * after normalization, the following are guaranteed about the snippet:
 * - snippet variables are substituted into the trigger
 * - `options.regex` and `options.visual` are set properly
 * - if it is a regex snippet, the trigger is represented as a RegExp instance with flags set
 */
function normalizeRawSnippet(raw: RawSnippet, snippetVariables: SnippetVariables): NormalizedRawSnippet {
	const { replacement, priority, description } = raw;
	
	const options = Options.fromSource(raw.options);

	// we have a regex snippet
	if (options.regex || raw.trigger instanceof RegExp) {
		let triggerStr: string;
		// normalize flags to a string
		let flags = raw.flags ?? "";

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
		const excludedEnvironments = getExcludedEnvironments(triggerStr);

		// Add $ so regex matches end of string
		// i.e. look for a match at the cursor's current position	
		triggerStr = `${triggerStr}$`;

		// convert trigger into RegExp instance
		const trigger = new RegExp(triggerStr, flags);

		options.regex = true;
		
		return { trigger, replacement, options, priority, description, excludedEnvironments };
	}

	let trigger = raw.trigger as string;
	// substitute snippet variables
	trigger = insertSnippetVariables(trigger, snippetVariables);

	// get excluded environment(s) for this trigger, if any
	const excludedEnvironments = getExcludedEnvironments(trigger);


	// normalize visual replacements
	if (typeof replacement === "string" && replacement.includes(VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER)) {
		options.visual = true;
	}

	return { trigger, replacement, options, priority, description, excludedEnvironments };
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

/** parse normalized raw snippet into final snippet representation */

/**
 * parses a normalized raw snippet into a Snippet
 */
export function parseSnippet(normalized: NormalizedRawSnippet): Snippet {
	const type = getSnippetType(normalized);

	switch (type) {
		case "visual": {
			const { trigger, replacement, options, priority, description, excludedEnvironments } = normalized as NormalizedRawStringOrVisualSnippet;
			return new VisualSnippet({ trigger, replacement, options, priority, description, excludedEnvironments });
		}
		case "regex": {
			const { trigger, replacement, options, priority, description, excludedEnvironments } = normalized as NormalizedRawRegexSnippet;
			return new RegexSnippet({ trigger, replacement, options, priority, description, excludedEnvironments });
		}
		case "string": {
			const { trigger, replacement, options, priority, description, excludedEnvironments } = normalized as NormalizedRawStringOrVisualSnippet;
			return new StringSnippet({ trigger, replacement, options, priority, description, excludedEnvironments });
		}
		default:
			throw "internal error: unrecognized snippet type";
	}
}

/**
 * determines the type of a normalized snippet.
 * 
 * @throws if it detects an invalid type arrangement (e.g. it satisfies more than one snippet type)
 */
function getSnippetType(normalized: NormalizedRawSnippet): SnippetType {
	const r = isRegexSnippet(normalized);
	const v = isVisualSnippet(normalized);
	if (r && v) { throw "snippet cannot be both regex and visual."; }
	if (r) { return "regex"; }
	if (v) { return "visual"; }
	return "string";
}

function isVisualSnippet(normalized: NormalizedRawSnippet) {
	return normalized.options.visual;
}
function isRegexSnippet(normalized: NormalizedRawSnippet) {
	return normalized.options.regex;
}

function insertSnippetVariables(trigger: string, variables: SnippetVariables) {
	for (const [variable, replacement] of Object.entries(variables)) {
		trigger = trigger.replace(variable, replacement);
	}

	return trigger;
}

function getExcludedEnvironments(trigger: string): Environment[] {
	const result = [];
	if (EXCLUSIONS.hasOwnProperty(trigger)) {
		result.push(EXCLUSIONS[trigger]);
	}
	return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn<Args extends readonly any[], Ret> = (...args: Args) => Ret;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = Fn<any, any>;