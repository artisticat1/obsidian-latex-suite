import { EditorView } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { SnippetChangeSpec } from "./snippet_change_spec";

const queueSnippetEffect = StateEffect.define<SnippetChangeSpec>();
const clearSnippetQueueEffect = StateEffect.define();

export const snippetQueueStateField = StateField.define<SnippetChangeSpec[]>({

	create() {
		return [];
	},

	update(oldState, transaction) {
		let snippetQueue = oldState;

		for (const effect of transaction.effects) {
			if (effect.is(queueSnippetEffect)) {
				snippetQueue.push(effect.value);
			}
			else if (effect.is(clearSnippetQueueEffect)) {
				snippetQueue = [];
			}
		}

		return snippetQueue;
	},
});


export function queueSnippet(view: EditorView, from: number, to: number, insert: string, keyPressed?: string) {
	const snippet = new SnippetChangeSpec(from, to, insert, keyPressed);

	view.dispatch({
		effects: [queueSnippetEffect.of(snippet)],
	});
}

export function clearSnippetQueue(view: EditorView) {
	view.dispatch({
		effects: [clearSnippetQueueEffect.of(null)],
	});
}