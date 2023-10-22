import { ParsedSnippet, RawSnippet } from "./snippets";
import { parse } from "json5";
import { encode } from "js-base64";

export function sortSnippets(snippets:ParsedSnippet[]) {
	// Sort snippets by trigger length so longer snippets will have higher priority

	function compareTriggerLength(a:ParsedSnippet, b:ParsedSnippet) {
		const aTriggerLength = a.trigger.length;
		const bTriggerLength = b.trigger.length;

		if (aTriggerLength < bTriggerLength){
			return 1;
		}
		if (aTriggerLength > bTriggerLength){
			return -1;
		}
		return 0;
	}
	snippets.sort(compareTriggerLength);

	// Sort snippets in order of priority

	function comparePriority(a:ParsedSnippet, b:ParsedSnippet) {
		const aPriority = a.priority ? a.priority : 0;
		const bPriority = b.priority ? b.priority : 0;

		if (aPriority < bPriority){
			return 1;
		}
		if (aPriority > bPriority){
			return -1;
		}
		return 0;
	}

	snippets.sort(comparePriority);
}

export async function importSnippets(resourcePath: string): Promise<ParsedSnippet[]> {
	const rawSnippets = (await import(resourcePath)).default;
	if (!validateSnippets(rawSnippets)) { throw "Invalid snippet format."; }
	
	const parsedSnippets = rawSnippets.map(rawSnippet => new ParsedSnippet(rawSnippet));
	sortSnippets(parsedSnippets);

	return parsedSnippets;
}

export async function parseSnippets(snippetsStr: string) {
	// first try to import it as a javascript module
	try {
		// js-base64.encode is needed over builtin `window.btoa` because the latter errors on unicode
		return await importSnippets(`data:text/javascript;base64,${encode(snippetsStr)}`);
	} catch (e) { /* don't need to do anything here - will naturally fall through, since try case returns */ }

	/// could theoretically absolve the need for json5 by doing this instead
	// return await importSnippets(`data:text/javascript;base64,${encode(`export default ${snippetsStr}`)}`);

	const rawSnippets = parse(snippetsStr);
	if (!validateSnippets(rawSnippets)) throw "Invalid snippet format.";

	const parsedSnippets = rawSnippets.map(rawSnippet => new ParsedSnippet(rawSnippet));
	sortSnippets(parsedSnippets);

	return parsedSnippets;
}

export function validateSnippets(snippets: unknown): snippets is RawSnippet[] {
	if (!Array.isArray(snippets)) { return false; }
	
	return snippets.every(snippet => (
		// check that trigger is defined
		(typeof snippet.trigger === "string" || snippet.trigger instanceof RegExp)
		// check that replacement is defined
		&& (typeof snippet.replacement === "string")
		// check that options is defined
		&& (typeof snippet.options === "string")
		// check that flags, if defined, is a string
		&& (typeof snippet.flags === "undefined" || typeof snippet.flags === "string")
	));
}
