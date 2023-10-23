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
		typeof snippet === "object"
		&& validateTrigger(snippet.trigger)
		&& validateReplacement(snippet.replacement)
		&& validateOptions(snippet.options)
		&& validateFlags(snippet.flags)
		&& validatePriority(snippet.priority)
	));
}

function validateTrigger(trigger: unknown): boolean {
	return typeof trigger === "string" || trigger instanceof RegExp;
}

function validateReplacement(replacement: unknown): boolean {
	return typeof replacement === "string" || typeof replacement === "function";
}

function validateOptions(options: unknown): options is string {
	return typeof options === "string";
}

function validateFlags(flags: unknown) {
	// flags are optional
	return typeof flags === "undefined" || typeof flags === "string";
}

function validatePriority(priority: unknown): priority is number | undefined {
	// priority is optional
	return typeof priority === "undefined" || typeof priority === "number";
}