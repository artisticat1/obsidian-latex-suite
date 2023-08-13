import { ParsedSnippet, RawSnippet } from "./snippets";
import { parse } from "json5";

export function sortSnippets(snippets:ParsedSnippet[]) {
	// Sort snippets by trigger length so longer snippets will have higher priority

	function compareTriggerLength( a:ParsedSnippet, b:ParsedSnippet ) {
		const aTriggerLength= a.trigger.length;
		const bTriggerLength= b.trigger.length;

		if ( aTriggerLength < bTriggerLength ){
			return 1;
		}
		if ( aTriggerLength > bTriggerLength ){
			return -1;
		}
		return 0;
	}
	snippets.sort(compareTriggerLength);

	// Sort snippets in order of priority

	function compare( a:ParsedSnippet, b:ParsedSnippet ) {
		const aPriority = a.priority === undefined ? 0 : a.priority;
		const bPriority = b.priority === undefined ? 0 : b.priority;

		if ( aPriority < bPriority ){
			return 1;
		}
		if ( aPriority > bPriority ){
			return -1;
		}
		return 0;
	}

	snippets.sort(compare);
}


export function getSnippetsFromString(snippetsStr: string) {
	const snippets: RawSnippet[] = parse(snippetsStr);

	if (!validateSnippets(snippets)) throw "Invalid snippet format.";

	return snippets.map(rawSnippet => new ParsedSnippet(rawSnippet));
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
