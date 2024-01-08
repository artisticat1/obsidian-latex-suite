import { Options } from "./options";

/**
 * in visual snippets, if the replacement is a string, this is the magic substring to indicate the selection.
 */
export const VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER = "${VISUAL}";

/**
 * a snippet object contains all the information necessary to run a snippet
 */
export type Snippet =
	| VisualSnippet
	| RegexSnippet
	| StringSnippet

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
export type SnippetType = Snippet["type"];

interface _Snippet {
	type: string;
	options: Options;
	priority?: number;
	description?: string;
}

interface VisualSnippet extends _Snippet {
	type: "visual";
	trigger: string;
	replacement: string | ((selection: string) => string | false);
}

interface RegexSnippet extends _Snippet {
	type: "regex";
	trigger: string;
	replacement: string | ((match: RegExpExecArray) => string);
	flags?: string;
}

interface StringSnippet extends _Snippet {
	type: "string";
	trigger: string;
	replacement: string | ((match: string) => string);
	flags?: string;
}

/**
 * serialize some snippet-like value.
 * specifically, does a pretty-printed JSON.stringify (2-space indent)
 * that serializes functions to the string "[[Function]]"
 */
export function serializeSnippet(snippet: unknown): string {
	function replacer(k: string, v: unknown) {
		if (typeof v === "function") { return "[[Function]]"; }
		if (v instanceof RegExp) { return `[[RegExp]]: ${v.toString()}`; }
		return v;
	}
	return JSON.stringify(snippet, replacer, 2);
}