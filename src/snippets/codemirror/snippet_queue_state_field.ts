import { EditorView, ViewPlugin } from "@codemirror/view";
import { SnippetChangeSpec } from "./snippet_change_spec";
import { getIndentUnit, indentString } from "@codemirror/language";
import { countColumn, EditorState } from "@codemirror/state";
import { applyReplacements, type Replacement, type ResultInsert } from "../luasnip_api/node";
import { modifiedSyntaxTree } from "src/parser/language";
import type { SyntaxNode } from "@lezer/common";
export const snippetQueuePlugin = ViewPlugin.fromClass(
	class {
		snippetQueue: SnippetChangeSpec[] = [];


		clearSnippetQueue() {
			this.snippetQueue = [];
		}
		
		executeSnippetQueue() {
			const queue = this.snippetQueue;
			this.snippetQueue = [];
			return queue;
		}
		
		QueueSnippets(values: SnippetChangeSpec[]) {
			this.snippetQueue = this.snippetQueue.concat(values);
		}
	}
)

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

export function getOuterNode(node: SyntaxNode): SyntaxNode {
	for (; node.parent && node.parent.from === node.from && !node.parent.type.isTop; node = node.parent) { /* empty */ }
	return node;
}


function keepIndentAndCallout(state: EditorState, from: number,to: number, replacement: ResultInsert): ResultInsert {
	const line = state.doc.lineAt(from);
	const tree = modifiedSyntaxTree(state);
	const before = line.text.slice(0, from - line.from);
	const firstNonWhitespace = before.search(/\S/);
	const qouteMarks = [];
	let lastMarkTo = line.from;
	const marks = ["ListMark", "QuoteMark", "TaskMarker"];
	if (firstNonWhitespace !== -1) {
		const node = getOuterNode(tree.resolveInner(firstNonWhitespace + line.from, 1));
		const cursor = node.cursor();
		while (cursor.from < lastMarkTo && cursor.next()) { /* empty */ }
		do {
			if (!marks.includes(cursor.name)) {
				continue;
			}
			const endsWithSpace = /\s/.test(state.sliceDoc(cursor.node.to, cursor.node.to + 1));

			lastMarkTo = cursor.node.to + (endsWithSpace ? 1 : 0);
			if (cursor.name === "QuoteMark") {
				qouteMarks.push(state.sliceDoc(cursor.from, lastMarkTo));
			}
		} while (cursor.next() && !(cursor.from > to || cursor.from > line.to));
	}
	const callouts = qouteMarks.join("");

	const lineText = line.text.slice(lastMarkTo - line.from);
	const indent = lineText.match(/^(\s*)/);
	const indentation = indent?.[1] ?? "";
	const originalColIndent = countColumn(indentation, state.tabSize);
	const indentUnitSize = getIndentUnit(state);
	const misalignment = originalColIndent % indentUnitSize;	
	
	const matches = replacement.insert.matchAll(/\n(\t*)/g);
	if (!matches) return replacement;

	const tabstops = replacement.tabstops
	const replacementInsert: Replacement[] = []
	let offset = 0;
	for (const match of matches) {
		const p1 = match[1]!;
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
