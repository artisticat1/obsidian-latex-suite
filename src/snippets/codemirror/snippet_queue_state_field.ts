import { EditorView, ViewPlugin } from "@codemirror/view";
import { SnippetChangeSpec } from "./snippet_change_spec";
import { getIndentUnit, indentString } from "@codemirror/language";
import { countColumn, EditorState } from "@codemirror/state";
import { applyReplacements, Replacement, ResultInsert } from "../luasnip_api/node";
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
		return this.snippetQueue.map(s => new SnippetChangeSpec(s.from, s.to, s.insert, s.keyPressed, s.after));
	}
})

export function getSnippetQueue(view: EditorView) {
	const plugin = view.plugin(snippetQueuePlugin);
	if (!plugin) {
		throw new Error("SnippetQueue plugin not found, something went wrong with the plugin initialization");
	}
	return plugin
}

export function queueSnippet(view: EditorView, from: number, to: number, insert: ResultInsert, keyPressed?: string, after?: number) {
	insert = keepIndentAndCallout(view.state, from, to, insert);
	const snippet = new SnippetChangeSpec(from, to, insert, keyPressed, after);
	getSnippetQueue(view).QueueSnippets([snippet]);
}

const keepIndentAndCallout = (state: EditorState, _from: number, to: number, replacement: ResultInsert): ResultInsert => {
	const line = state.doc.lineAt(to);
	const lineText = line.text;
	const calloutAndIndent = lineText.match(/^(>*)(\s*)/);
	if (!calloutAndIndent) return replacement;
	const callouts = calloutAndIndent[1];
	const indentation = calloutAndIndent[2];
	const originalColIndent = countColumn(indentation, state.tabSize);
	const indentUnitSize = getIndentUnit(state);
	const misalignment = originalColIndent % indentUnitSize;

	const matches = replacement.insert.matchAll(/\n(\t*)/g);
	if (!matches) return replacement;

	const tabstops = replacement.tabstops
	const replacementInsert: Replacement[] = []
	let offset = 0;
	for (const match of matches) {
		const p1 = match[1];
		// not preserving misalignment when indent level is increased
		const newColIndent =
			p1.length * indentUnitSize +
			originalColIndent -
			(p1.length && misalignment);
		const indent = indentString(state, newColIndent);
		const newIndent = "\n" + callouts + indent;
		const addedLength = newIndent.length - match[0].length;
		for (const ts of tabstops) {
			if (ts.from - offset > match.index) {
				ts.from += addedLength;
			}
			if (ts.to - offset > match.index) {
				ts.to += addedLength;
			}
		}
		offset += addedLength;
		replacementInsert.push({start: match.index, end: match.index + match[0].length, replacement: newIndent});

	};
	return {
		insert: applyReplacements(replacement.insert, replacementInsert),
		tabstops: tabstops
	}

}
export function clearSnippetQueue(view: EditorView) {
	getSnippetQueue(view).clearSnippetQueue();
}
