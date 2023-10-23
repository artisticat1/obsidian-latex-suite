import { Options } from "./options";

/**
 * there are 3 distinct types of snippets:
 * 
 * `visual` snippets only trigger on text selections.
 * visual snippets support only (single-character) string triggers, and string or function replacements.
 * visual replacement functions take in the text selection and return a string, or `false` to indicate to actually not do anything.
 * 
 * `regex` snippets support string (with the "r" raw option set) or regex triggers, and string or function replacements.
 * regex replacement functions take in the regex match and return a string.
 * 
 * `string` snippets support string triggers (when no "r" raw option set), and string or function replacements.
 * string replacement functions take in the matched string and return a string.
 */
type SnippetType =
	| "visual"
	| "regex"
	| "string";

type Replacer<T extends SnippetType = SnippetType> =
	T extends "visual" ? (match: string) => string | false
	: T extends "regex" ? (match: RegExpExecArray) => string
	: T extends "string" ? (match: string) => string
	: never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any) => any;

/**
 * represents the bare amount of information we know after validation
 */
export interface RawSnippet {
	trigger: string | RegExp;
	replacement: string | AnyFunction;
	options: string;
	priority?: number;
	flags?: string;
	description?: string;
}

export class ParsedSnippet<T extends SnippetType = SnippetType> {
	type: T;
	trigger: string;
	replacement: string | Replacer<T>;
	options: Options;
	flags: string;
	priority?: number;
	description?: string;
	
	constructor(raw: RawSnippet) {
		// normalize regex triggers
		const resolved: RawSnippet = { ...raw, flags: raw.flags ?? "" };
		if (raw.trigger instanceof RegExp) {
			resolved.options = `r${raw.options}`;
			resolved.trigger = raw.trigger.source;
			// regex trigger flags and snippet flags get merged 
			resolved.flags = `${raw.trigger.flags}${resolved.flags}`;
		}

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
		resolved.flags = Array.from(new Set(resolved.flags.split("")))
			.filter(flag => validFlags.includes(flag))
			.join("");

		const resolvedOptions = Options.fromSource(resolved.options);
		const type = getSnippetType(resolved.replacement, resolvedOptions);

		const parsed = {type: type, ...resolved, options: resolvedOptions };
		Object.assign(this, parsed);
	}
}

export interface Environment {
	openSymbol: string,
	closeSymbol: string
}

export const EXCLUSIONS:{[trigger: string]: Environment} = {
	"([A-Za-z])(\\d)": {openSymbol: "\\pu{", closeSymbol: "}"},
	"->": {openSymbol: "\\ce{", closeSymbol: "}"}
}

function getSnippetType(replacement: string | Replacer, options: Options): SnippetType {
	if (options.visual || (typeof replacement === "string" && replacement.contains("${VISUAL}"))) { return "visual"; }
	if (options.regex) { return "regex"; }
	return "string";
}