import { EditorView } from "@codemirror/view";
import { SnippetChangeSpec } from "./snippet_change_spec";
export const snippetQueueStateField = new class {
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
}


export function queueSnippet(from: number, to: number, insert: string, keyPressed?: string) {
	const snippet = new SnippetChangeSpec(from, to, insert, keyPressed);
	snippetQueueStateField.QueueSnippets([snippet]);
}

export function clearSnippetQueue() {
	snippetQueueStateField.clearSnippetQueue();
}
