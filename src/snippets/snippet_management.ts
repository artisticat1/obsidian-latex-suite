import { EditorView } from "@codemirror/view";
import { ChangeSet, EditorSelection } from "@codemirror/state";
import { endSnippet, startSnippet } from "./codemirror/history";
import { isolateHistory } from "@codemirror/commands";
import { TabstopSpec, tabstopSpecsToTabstopGroups } from "./tabstop";
import { addTabstops, getNextTabstopColor, tabstopsStateField } from "./codemirror/tabstops_state_field";
import { clearSnippetQueue, getSnippetQueue } from "./codemirror/snippet_queue_state_field";
import { SnippetChangeSpec } from "./codemirror/snippet_change_spec";
import { resetCursorBlink } from "src/utils/editor_utils";

export function expandSnippets(view: EditorView):boolean {
	const snippetsToExpand = getSnippetQueue(view).snippetQueueValue;
	if (snippetsToExpand.length === 0) return false;

	const originalDocLength = view.state.doc.length;

	// Try to apply changes all at once, because `view.dispatch` gets expensive for large documents
	const undoChanges = handleUndoKeypresses(view, snippetsToExpand);
	// If from===to, normally the cursor would be before the text, but after the text makes more sense as that happens when from <to.
	const selection = view.state.selection.map(undoChanges, 1);
	const newText = undoChanges.apply(view.state.doc).toString();
	const tabstopsToAdd = computeTabstops(newText, snippetsToExpand, originalDocLength);
	const changes = {
		changes: undoChanges,
		selection: selection
	}

	// Insert any tabstops
	if (tabstopsToAdd.length === 0) {
		view.dispatch(changes)
		clearSnippetQueue(view);
		return true;
	}

	expandTabstops(view, tabstopsToAdd, changes, newText.length);

	clearSnippetQueue(view);
	return true;
}

function handleUndoKeypresses(view: EditorView, snippets: SnippetChangeSpec[]) {
	const originalDoc = view.state.doc;
	const originalDocLength = originalDoc.length;

	const keyPresses: {from: number, to: number, insert: string}[] = [];
	for (const snippet of snippets) {
		if (snippet.keyPressed && (snippet.keyPressed.length === 1)) {
			// Use prevChar so that cursors are placed at the end of the added text
			const to = snippet.after ?? snippet.to;
			const prevChar = view.state.doc.sliceString(to-1, to);

			const from = to === 0 ? 0 : to-1;
			keyPresses.push({from: from, to, insert: prevChar + snippet.keyPressed});
		}
	}

	// Insert the keypresses
	// Use isolateHistory to allow users to undo the triggering of a snippet,
	// but keep the text inserted by the trigger key
	if (keyPresses.length > 0) {
		view.dispatch({
			changes: keyPresses,
			annotations: isolateHistory.of("full"),
		});
	}

	// Undo the keypresses, and insert the replacements
	const undoKeyPresses = ChangeSet.of(keyPresses, originalDocLength).invert(originalDoc);
	const changesAsChangeSet = ChangeSet.of(snippets, originalDocLength);
	const combinedChanges = undoKeyPresses.compose(changesAsChangeSet);

	// Mark the transaction as the beginning of a snippet (for undo/history purposes)
	return combinedChanges;
}

function computeTabstops(text: string, snippets: SnippetChangeSpec[], originalDocLength: number) {
	// Find the positions of the cursors in the new document
	const changeSet = ChangeSet.of(snippets, originalDocLength);
	const oldPositions = snippets.map(change => change.from);
	const newPositions = oldPositions.map(pos => changeSet.mapPos(pos));

	const tabstopsToAdd:TabstopSpec[] = [];
	for (let i = 0; i < snippets.length; i++) {
		tabstopsToAdd.push(...snippets[i].getTabstops(text, newPositions[i]));
	}

	return tabstopsToAdd;
}

function expandTabstops(
	view: EditorView,
	tabstops: TabstopSpec[],
	undoChanges: {
		changes:ChangeSet,
		selection: EditorSelection
	},
	newLength: number
) {
	const changes = ChangeSet.of(
		tabstops.map((tabstop: TabstopSpec) => {
			return {
				from: tabstop.from,
				to: tabstop.to,
				insert: tabstop.replacement,
			};
		}),
		newLength
	);
	const color = getNextTabstopColor(view);
	const tabstopGroups = tabstopSpecsToTabstopGroups(tabstops, color);
	tabstopGroups.forEach((grp) => grp.map(changes));
	const frozenTabstopGroups = tabstopGroups.map(grp => grp.copy())
	// Insert the replacements
	const effects = addTabstops(tabstopGroups).effects;
	const firstGrp = tabstopGroups[0];
	const sel = firstGrp.toEditorSelection();
	const spec = {
		selection: sel,
		effects: endSnippet.of(null),
		sequential: true
	};
	view.dispatch({
		effects: [...effects, startSnippet.of(frozenTabstopGroups)],
		changes: undoChanges.changes.compose(changes),
		selection: undoChanges.selection
	}, spec);
}

// Returns true if the transaction was dispatched
export function setSelectionToNextTabstop(view: EditorView, shiftKey: boolean): boolean {
	const tabstopGroups = view.state.field(tabstopsStateField).tabstopGroups;
	const index = view.state.field(tabstopsStateField).index;

	function aux(nextGrpIndex: number, direction: 1 | -1): boolean {
		const nextGrp = tabstopGroups[nextGrpIndex];
		if (!nextGrp) return false;

		const currSel = view.state.selection;
		// If the current selection lies within the next tabstop(s), move the cursor
		// to the endpoint(s) of the next tabstop(s)
		let nextGrpSel = nextGrp.toEditorSelection();
		if (nextGrp.containsSelection(currSel)) {
			nextGrpSel = nextGrp.toEditorSelection(true);
		}

		if (currSel.eq(nextGrpSel)){
			return aux(nextGrpIndex + direction, direction);
		}

		view.dispatch({
			selection: nextGrpSel,
		});
		resetCursorBlink();

		return true;
	}
	const direction = shiftKey ? -1 : 1;
	return aux(index + direction, direction);
}
