import { EditorView } from "@codemirror/view";
import { EditorSelection, ChangeSpec, ChangeSet } from "@codemirror/state";
import { setCursor, setSelections, findMatchingBracket, resetCursorBlink } from "../editor_helpers";
import { startSnippet, endSnippet } from "./codemirror/history";
import { isolateHistory } from "@codemirror/commands";

import { TabstopSpec, getTabstopGroupEndpoints, tabstopGroupLiesWithinAnother } from "./tabstop";
import { addTabstops, consumeTabstop, clearAllTabstops, tabstopsStateField } from "./codemirror/tabstops_state_field";
import { clearSnippetQueue, snippetQueueStateField } from "./codemirror/snippet_queue_state_field";


function getTabstopsFromSnippet(view: EditorView, start: number, replacement:string):TabstopSpec[] {

	const tabstops:TabstopSpec[] = [];
	const text = view.state.doc.toString();

	for (let i = start; i < start + replacement.length; i++) {

		if (!(text.charAt(i) === "$")) {
			continue;
		}

		let number:number = parseInt(text.charAt(i + 1));

		const tabstopStart = i;
		let tabstopEnd = tabstopStart + 2;
		let tabstopReplacement = "";


		if (isNaN(number)) {
			// Check for selection tabstops of the form ${0:XXX}
			if (!(text.charAt(i+1) === "{" && text.charAt(i+3) === ":")) continue;

			number = parseInt(text.charAt(i + 2));
			if (isNaN(number)) continue;

			// Find the matching }
			const closingIndex = findMatchingBracket(text, i+1, "{", "}", false, start + replacement.length);

			if (closingIndex === -1) continue;

			tabstopReplacement = text.slice(i + 4, closingIndex);
			tabstopEnd = closingIndex + 1;
			i = closingIndex;
		}

		// Replace the tabstop indicator "$X" with ""
		const tabstop:TabstopSpec = {number: number, from: tabstopStart, to: tabstopEnd, replacement: tabstopReplacement};

		tabstops.push(tabstop);
	}


	return tabstops;
}


export function expandSnippets(view: EditorView):boolean {
	const snippetsToAdd = view.state.field(snippetQueueStateField);
	if (snippetsToAdd.length === 0) return false;

	const originalDoc = view.state.doc;
	const originalDocLength = view.state.doc.length;
	const snippets = snippetsToAdd;
	const changes = snippets as ChangeSpec;


	const keyPresses: {from: number, to: number, insert: string}[] = [];
	for (const snippet of snippets) {
		if (snippet.keyPressed && (snippet.keyPressed.length === 1)) {
			// Use prevChar so that cursors are placed at the end of the added text
			const prevChar = view.state.doc.sliceString(snippet.to-1, snippet.to);

			const from = snippet.to === 0 ? 0 : snippet.to-1;
			keyPresses.push({from: from, to: snippet.to, insert: prevChar + snippet.keyPressed});
		}
	}

	// Insert the keypresses
	// Use isolateHistory to allow users to undo the triggering of a snippet,
	// but keep the text inserted by the trigger key
	view.dispatch({
		changes: keyPresses,
		annotations: isolateHistory.of("full")
	});

	// Undo the keypresses, and insert the replacements
	const undoKeyPresses = ChangeSet.of(keyPresses, originalDocLength).invert(originalDoc);
	const changesAsChangeSet = ChangeSet.of(changes, originalDocLength);
	const combinedChanges = undoKeyPresses.compose(changesAsChangeSet);


	view.dispatch({
		changes: combinedChanges,
		effects: startSnippet.of(null)
	});


	// Insert any tabstops
	// Find the positions of the cursors in the new document
	const changeSet = ChangeSet.of(changes, originalDocLength);
	const oldPositions = snippets.map(change => change.from);
	const newPositions = oldPositions.map(pos => changeSet.mapPos(pos));

	let tabstopsToAdd:TabstopSpec[] = [];
	for (let i = 0; i < snippets.length; i++) {
		tabstopsToAdd = tabstopsToAdd.concat(getTabstopsFromSnippet(view, newPositions[i], snippets[i].insert));
	}

	if (tabstopsToAdd.length === 0) {
		clearSnippetQueue(view);
		return true;
	}

	markTabstops(view, tabstopsToAdd);
	insertTabstops(view, tabstopsToAdd);

	clearSnippetQueue(view);
	return true;
}

function tabstopSpecsToTabstopGroups(tabstops: TabstopSpec[]) {
	const N = Math.max(...tabstops.map(tabstop => tabstop.number));
	const tabstopGroups = Array(N);

	for (const tabstop of tabstops) {
		const n = tabstop.number;

		if (tabstopGroups[n]) {
			tabstopGroups[n] = tabstopGroups[n].addRange(EditorSelection.range(tabstop.from, tabstop.to));
		}
		else {
			tabstopGroups[n] = EditorSelection.single(tabstop.from, tabstop.to);
		}
	}

	// Remove empty tabstop groups
	const result = tabstopGroups.filter(value => value);

	return result;
}


function markTabstops(view: EditorView, tabstops: TabstopSpec[]) {
	const tabstopGroups = tabstopSpecsToTabstopGroups(tabstops);

	addTabstops(view, tabstopGroups);
}


function insertTabstops(view: EditorView, tabstops: TabstopSpec[]) {

	// Insert the replacements
	const changes = tabstops.map((tabstop: TabstopSpec) => {
		return {from: tabstop.from, to: tabstop.to, insert: tabstop.replacement}
	});

	view.dispatch({
		changes: changes
	});


	// Select the first tabstop
	const currentTabstopGroups = view.state.field(tabstopsStateField);
	const firstRef = currentTabstopGroups[0];
	const selection = EditorSelection.create(firstRef.ranges);

	view.dispatch({
		selection: selection,
		effects: endSnippet.of(null)
	});

	resetCursorBlink();
	removeOnlyTabstop(view);
}


function selectTabstopGroup(view: EditorView, tabstopGroup: EditorSelection) {
	// Select all ranges
	setSelections(view, tabstopGroup);

	removeOnlyTabstop(view);
}

function removeOnlyTabstop(view: EditorView) {
	// Remove all tabstop groups if there's just one containing zero width tabstops
	const currentTabstopGroups = view.state.field(tabstopsStateField);
	if (currentTabstopGroups.length === 1) {
		let shouldClear = true;

		const tabstopGroup = currentTabstopGroups[0];
		const ranges = tabstopGroup.ranges;

		for (const range of ranges) {
			if (!(range.from === range.to)) {
				shouldClear = false;
				break;
			}
		}

		if (shouldClear) clearAllTabstops(view);
	}
}


export function isInsideATabstop(pos: number, view: EditorView):boolean {
	const currentTabstopGroups = view.state.field(tabstopsStateField);
	if (currentTabstopGroups.length === 0) return false;

	let isInside = false;

	for (const tabstopGroup of currentTabstopGroups) {
		for (const range of tabstopGroup.ranges) {
			if ((pos >= range.from) && (pos <= range.to)) {
				isInside = true;
				break;
			}
		}

		if (isInside) break;
	}

	return isInside;
}


export function isInsideLastTabstop(view: EditorView):boolean {
	const currentTabstopGroups = view.state.field(tabstopsStateField);
	if (currentTabstopGroups.length === 0) return false;

	let isInside = false;

	const lastTabstopRef = currentTabstopGroups.slice(-1)[0];
	const ranges = lastTabstopRef.ranges;
	const lastRange = ranges[0];

	const sel = view.state.selection.main;

	isInside = sel.eq(lastRange);

	return isInside;
}


export function consumeAndGotoNextTabstop(view: EditorView): boolean {
	// Check whether there are currently any tabstops
	let currentTabstopGroups = view.state.field(tabstopsStateField);
	if (currentTabstopGroups.length === 0) return false;

	const oldCursor = view.state.selection.main;

	// Remove the tabstop that we're inside of
	consumeTabstop(view);

	// If there are none left, return
	currentTabstopGroups = view.state.field(tabstopsStateField);
	if (currentTabstopGroups.length === 0) {
		setCursor(view, oldCursor.to);

		return true;
	}

	// Select the next tabstop
	const newTabstop = currentTabstopGroups[0];
	const newRanges = newTabstop.ranges;


	// If the next tabstop is empty, go again
	if (newRanges.length === 0)
	return consumeAndGotoNextTabstop(view);


	// If the old tabstop(s) lie within the new tabstop(s), simply move the cursor
	if (tabstopGroupLiesWithinAnother(view.state.selection, newTabstop)) {
		setSelections(view, getTabstopGroupEndpoints(newTabstop));
	}
	else {
		selectTabstopGroup(view, newTabstop);
	}


	// If we haven't moved, go again
	const newCursor = view.state.selection.main;

	if (oldCursor.eq(newCursor))
		return consumeAndGotoNextTabstop(view);

	return true;
}


export function removeAllTabstops(view?: EditorView) {
	if (view) {
		clearAllTabstops(view);
	}
}
