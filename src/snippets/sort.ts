import type { Snippet } from "./snippets";

export function sortSnippets(snippets: Snippet[]) {
	snippets.sort(snippetCompare);
}

/**
 * Sorts snippets by priority, falling back to trigger length if there is a tie
 */
export function snippetCompare(a: Snippet, b: Snippet) {
	return comparePriority(a, b) || compareTriggerLength(a, b);
}

/**
 * Sorts snippets by trigger length so longer snippets will have higher priority
 */
function compareTriggerLength(a: Snippet, b: Snippet) {
	const aTriggerLength = a.trigger.length;
	const bTriggerLength = b.trigger.length;

	if (aTriggerLength < bTriggerLength) { return 1; }
	if (aTriggerLength > bTriggerLength) { return -1; }
	return 0;
}

/**
 * Sorts snippets in order of priority
 */
function comparePriority(a: Snippet, b: Snippet) {
	const aPriority = a.priority ? a.priority : 0;
	const bPriority = b.priority ? b.priority : 0;

	if (aPriority < bPriority) { return 1; }
	if (aPriority > bPriority) { return -1; }
	return 0;
}