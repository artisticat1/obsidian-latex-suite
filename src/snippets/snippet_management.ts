import { EditorView } from "@codemirror/view";
import { EditorSelection, ChangeSpec, ChangeSet } from "@codemirror/state";
import { setSelections, findMatchingBracket, resetCursorBlink } from "../editor_helpers";
import { startSnippet, endSnippet } from "./codemirror/history";
import { isolateHistory } from "@codemirror/commands";

import { TabstopSpec, getEditorSelectionEndpoints, editorSelectionLiesWithinAnother, tabstopSpecsToTabstopGroups } from "./tabstop";
import { addTabstops, removeTabstop, removeAllTabstops, getTabstopGroupsFromView, getNextTabstopColor, hideTabstopFromEditor } from "./codemirror/tabstops_state_field";
import { SnippetToAdd, clearSnippetQueue, snippetQueueStateField } from "./codemirror/snippet_queue_state_field";


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

	const originalDocLength = view.state.doc.length;
	const snippets = snippetsToAdd;
	const changes = snippets as ChangeSpec;

	handleUndoKeypresses(view, snippets, changes);

	const tabstopsToAdd = computeTabstops(view, snippets, changes, originalDocLength);

	// Insert any tabstops
	if (tabstopsToAdd.length === 0) {
		clearSnippetQueue(view);
		return true;
	}

	markTabstops(view, tabstopsToAdd);
	expandTabstops(view, tabstopsToAdd);

	clearSnippetQueue(view);
	return true;
}

function handleUndoKeypresses(view: EditorView, snippets: SnippetToAdd[], changes: ChangeSpec) {
	const originalDoc = view.state.doc;
	const originalDocLength = originalDoc.length;

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
}

function computeTabstops(view: EditorView, snippets: SnippetToAdd[], changes: ChangeSpec, originalDocLength: number) {
	// Find the positions of the cursors in the new document
	const changeSet = ChangeSet.of(changes, originalDocLength);
	const oldPositions = snippets.map(change => change.from);
	const newPositions = oldPositions.map(pos => changeSet.mapPos(pos));

	let tabstopsToAdd:TabstopSpec[] = [];
	for (let i = 0; i < snippets.length; i++) {
		tabstopsToAdd = tabstopsToAdd.concat(getTabstopsFromSnippet(view, newPositions[i], snippets[i].insert));
	}

	return tabstopsToAdd;
}

function markTabstops(view: EditorView, tabstops: TabstopSpec[]) {
	const color = getNextTabstopColor(view);
	const tabstopGroups = tabstopSpecsToTabstopGroups(tabstops, color);

	addTabstops(view, tabstopGroups);
}

function expandTabstops(view: EditorView, tabstops: TabstopSpec[]) {
	// Insert the replacements
	const changes = tabstops.map((tabstop: TabstopSpec) => {
		return {from: tabstop.from, to: tabstop.to, insert: tabstop.replacement}
	});

	view.dispatch({
		changes: changes
	});

	// Select the first tabstop
	const currentTabstopGroups = getTabstopGroupsFromView(view);
	const firstRef = currentTabstopGroups[0];
	const selection = EditorSelection.create(firstRef.ranges);

	view.dispatch({
		selection: selection,
		effects: endSnippet.of(null)
	});

	resetCursorBlink();
	hideTabstopFromEditor(view);
	removeOnlyTabstop(view);
}

function selectTabstopGroup(view: EditorView, tabstopGroup: EditorSelection) {
	// Select all ranges
	setSelections(view, tabstopGroup);
	hideTabstopFromEditor(view);
}

function removeOnlyTabstop(view: EditorView) {
	// Clear all tabstop groups if there's just one remaining
	const currentTabstopGroups = getTabstopGroupsFromView(view);

	if (currentTabstopGroups.length === 1) {
		removeAllTabstops(view);
	}
}

export function isInsideATabstop(view: EditorView):boolean {
	const currentTabstopGroups = getTabstopGroupsFromView(view);

	for (const tabstopGroup of currentTabstopGroups) {
		if (editorSelectionLiesWithinAnother(view.state.selection, tabstopGroup)) {
			return true;
		}
	}

	return false;
}

export function consumeAndGotoNextTabstop(view: EditorView): boolean {
	// Check whether there are currently any tabstops
	let currentTabstopGroups = getTabstopGroupsFromView(view);
	if (currentTabstopGroups.length === 0) return false;

	// Remove the tabstop that we're inside of
	removeTabstop(view);

	// Select the next tabstop
	const oldSel = view.state.selection;
	currentTabstopGroups = getTabstopGroupsFromView(view);
	const nextSel = currentTabstopGroups[0];

	// If the old tabstop(s) lie within the new tabstop(s), simply move the cursor
	if (editorSelectionLiesWithinAnother(view.state.selection, nextSel)) {
		setSelections(view, getEditorSelectionEndpoints(nextSel));
	}
	else {
		selectTabstopGroup(view, nextSel);
	}

	// If we haven't moved, go again
	const newSel = view.state.selection;

	if (oldSel.eq(newSel))
		return consumeAndGotoNextTabstop(view);

	// If this was the last tabstop group waiting to be selected, remove it
	removeOnlyTabstop(view);

	return true;
}
