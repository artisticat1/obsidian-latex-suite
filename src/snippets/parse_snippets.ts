import { ParsedSnippet, RawSnippet } from "./snippets";
import { parse } from "json5";

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


export function parseSnippets(snippetsStr: string) {
	const rawSnippets: RawSnippet[] = parse(snippetsStr);
	if (!validateSnippets(rawSnippets)) throw "Invalid snippet format.";

	const parsedSnippets = rawSnippets.map(rawSnippet => new ParsedSnippet(rawSnippet));
	sortSnippets(parsedSnippets);

	return parsedSnippets;
}


export function validateSnippets(snippets: RawSnippet[]):boolean {
	let valid = true;

	for (const snippet of snippets) {
		// Check that the snippet trigger, replacement and options are defined

		if (!(snippet.trigger && snippet.replacement && snippet.options != undefined)) {
			valid = false;
			break;
		}
	}

	return valid;
}
