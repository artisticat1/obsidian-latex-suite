import { EditorView } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";

export interface SnippetToAdd {
	from: number,
	to: number,
	insert: string,
	keyPressed?: string
}

export const queueSnippetEffect = StateEffect.define<SnippetToAdd>();
export const clearSnippetQueueEffect = StateEffect.define();

export const snippetQueueStateField = StateField.define<SnippetToAdd[]>({

	create(editorState) {
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


export function queueSnippet(view: EditorView, snippet: SnippetToAdd) {
	view.dispatch({
		effects: [queueSnippetEffect.of(snippet)],
	});
}

export function clearSnippetQueue(view: EditorView) {
	view.dispatch({
		effects: [clearSnippetQueueEffect.of(null)],
	});
}