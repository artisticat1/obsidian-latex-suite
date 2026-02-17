import { EditorView, ViewPlugin } from "@codemirror/view";
import { SnippetChangeSpec } from "./snippet_change_spec";
export const snippetQueuePlugin = ViewPlugin.fromClass(
	class {
	private snippetQueue: SnippetChangeSpec[] = [];


	clearSnippetQueue() {
		this.snippetQueue = [];
	}
	
	QueueSnippets(values: SnippetChangeSpec[]) {
		this.snippetQueue = this.snippetQueue.concat(values);
	}
	
	get snippetQueueValue(): SnippetChangeSpec[] {
		return this.snippetQueue.map(s => new SnippetChangeSpec(s.from, s.to, s.insert, s.keyPressed));
	}
})

export function getSnippetQueue(view: EditorView) {
	const plugin = view.plugin(snippetQueuePlugin);
	if (!plugin) {
		throw new Error("SnippetQueue plugin not found, something went wrong with the plugin initialization");
	}
	return plugin
}


export function queueSnippet(view: EditorView, from: number, to: number, insert: string, keyPressed?: string) {
	const snippet = new SnippetChangeSpec(from, to, insert, keyPressed);
	getSnippetQueue(view).QueueSnippets([snippet]);
}

export function clearSnippetQueue(view: EditorView) {
	getSnippetQueue(view).clearSnippetQueue();
}
