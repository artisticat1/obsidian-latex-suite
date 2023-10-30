import { ParsedSnippet, RawSnippet } from "./snippets";
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

export async function parseSnippets(snippetsStr: string) {
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

	if (!validateSnippets(rawSnippets)) { throw "Invalid snippet format."; }

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
