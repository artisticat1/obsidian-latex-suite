import { ViewUpdate } from "@codemirror/view";
import { StateEffect } from "@codemirror/state";
import { invertedEffects } from "@codemirror/commands";
import { TabstopGroup } from "../tabstop";

// Effects that mark the beginning and end of transactions to insert snippets

export const startSnippet = StateEffect.define<TabstopGroup[]>();
export const endSnippet = StateEffect.define();
export const undidStartSnippet = StateEffect.define<TabstopGroup[]>();
export const undidEndSnippet = StateEffect.define();


// Enables undoing and redoing snippets, taking care of the tabstops
export const snippetInvertedEffects = invertedEffects.of(tr => {
	const effects: StateEffect<unknown>[] = [];

	for (const effect of tr.effects) {
		if (effect.is(startSnippet)) {
			effects.push(undidStartSnippet.of(effect.value));
		}
		else if (effect.is(undidStartSnippet)) {
			effects.push(startSnippet.of(effect.value.map(grp => grp.copy())));
		}
		else if (effect.is(endSnippet)) {
			effects.push(undidEndSnippet.of(null));
		}
		else if (effect.is(undidEndSnippet)) {
			effects.push(endSnippet.of(null));
		}
	}


	return effects;
});

export const handleUndoRedo = (update: ViewUpdate): boolean => {
	const redoTr = update.transactions.find(tr => tr.isUserEvent("redo"));
	if (!redoTr) {
		return false;
	}

	for (const tr of update.transactions) {
		for (const effect of tr.effects) {

			if (effect.is(startSnippet) && redoTr) {
				const first = effect.value[0];
				const sel = first?.toEditorSelection();
				update.view.dispatch({
					selection: sel,
				})
			}
		}
	}

	return true; 
};
