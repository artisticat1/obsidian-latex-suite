import { EditorView } from "@codemirror/view";
import { Annotation, ChangeSet, EditorSelection } from "@codemirror/state";
import { endSnippet, startSnippet } from "./codemirror/history";
import { isolateHistory } from "@codemirror/commands";
import { TabstopSpec, tabstopSpecsToTabstopGroups } from "./tabstop";
import { addTabstops, getNextTabstopColor, tabstopsStateField } from "./codemirror/tabstops_state_field";
import { clearSnippetQueue, getSnippetQueue } from "./codemirror/snippet_queue_state_field";
import { SnippetChangeSpec } from "./codemirror/snippet_change_spec";
import { resetCursorBlink } from "src/utils/editor_utils";

// this function and the functions it calls are a bit too statefull
// its use as few dispatches as possible, but probably can be simplified.
export function expandSnippets(view: EditorView):boolean {
	const snippetsToExpand = getSnippetQueue(view).snippetQueueValue;
	if (snippetsToExpand.length === 0) return false;

	// Try to apply changes all at once, because `view.dispatch` gets expensive for large documents
	const undoChanges = handleUndoKeypresses(view, snippetsToExpand);
	// apply the changes to the changespec and the tabstops before retrieving
	const snippetChangeSpecs = snippetsToExpand.map(s => s.toChangeSpec());
	const newSnippets = snippetsToExpand.map(s => s.applyChange(undoChanges));
	
	const finalChanges = undoChanges.compose(ChangeSet.of(snippetChangeSpecs, undoChanges.newLength));

	const tabstopsToAdd = newSnippets.flatMap(s => s.getTabstops());
	// If from===to, normally the cursor would be before the text, but after the text makes more sense as that happens when from <to.
	const selection = view.state.selection.map(finalChanges, 1);
	const changes = {
		changes: finalChanges,
		selection: selection
	}

	// Insert any tabstops
	if (tabstopsToAdd.length === 0) {
		view.dispatch(changes)
		clearSnippetQueue(view);
		return true;
	}

	expandTabstops(view, tabstopsToAdd, changes);

	clearSnippetQueue(view);
	return true;
}
// optimization to avoid updating math preview and conceal when a keypress is pushed into the history but immediately undone
export const tempKeyPress = Annotation.define<true>();

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
			annotations: [isolateHistory.of("full"), tempKeyPress.of(true)],
		});
	}

	// Undo the keypresses, and insert the replacements
	const undoKeyPresses = ChangeSet.of(keyPresses, originalDocLength).invert(originalDoc);

	// Mark the transaction as the beginning of a snippet (for undo/history purposes)
	return undoKeyPresses;
}

function expandTabstops(
	view: EditorView,
	tabstops: TabstopSpec[],
	undoChanges: {
		changes:ChangeSet,
		selection: EditorSelection
	}
) {
	const color = getNextTabstopColor(view);
	const tabstopGroups = tabstopSpecsToTabstopGroups(tabstops, color);
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
		changes: undoChanges.changes,
		selection: undoChanges.selection,
		annotations: isolateHistory.of("before")
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
		resetCursorBlink(view);

		return true;
	}
	const direction = shiftKey ? -1 : 1;
	return aux(index + direction, direction);
}
