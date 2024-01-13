import type { Snippet } from "./snippets";

/**
 * creates a copy of a snippets array,
 * sorted by priority, falling back to trigger length if there is a tie.
 */
export function sortSnippets(snippets: Snippet[]): Snippet[] {
	// schwartzian transform:
	// trigger length is a factor for sorting,
	// but to get "length" of regex we need to get its source
	// (the debate regarding regex length being treated the same as regular string length is another issue).
	// the idea here is to avoid calling e.g. `RegExp.source()` over and over again when sorting,
	// by precomputing the values to sort by and associating each original element to these values,
	// sorting with this intermediate representation,
	// and retrieving back the original elements.
	return snippets
		// first precompute trigger lengths for each snippet while keeping a reference to the original snippet (via index in `snippets`),
		.map((snippet, i) => [getPriority(snippet), getTriggerLength(snippet), i])
		// sort resultant tuples representing the snippets
		.sort(schwartzianSnippetCompare)
		// and get back the snippets
		.map(([p, t, i]) => snippets[i]);
}

type SchwartzianIntermediateValue = [priority: number, triggerLength: number, i: number];

/**
 * Sorts snippets by priority, falling back to trigger length if there is a tie.
 */
export function schwartzianSnippetCompare(a: SchwartzianIntermediateValue, b: SchwartzianIntermediateValue) {
	return comparePriority(a[0], b[0]) || compareTriggerLength(a[1], b[1]);
}

/**
 * Sorts snippets by trigger length so longer snippets will have higher priority
 */
function compareTriggerLength(a: number, b: number) {
	if (a < b) { return 1; }
	if (a > b) { return -1; }
	return 0;
}

/**
 * Sorts snippets in order of priority
 */
function comparePriority(a: number, b: number) {
	if (a < b) { return 1; }
	if (a > b) { return -1; }
	return 0;
}

function getPriority(snippet: Snippet) {
	return snippet.priority || 0;
}

function getTriggerLength(snippet: Snippet) {
	return typeof snippet.trigger === "string"
		? snippet.trigger.length
		: snippet.trigger.source.length;
}