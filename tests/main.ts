import LatexSuitePlugin from "../src/main.js";
import { fullMathParser } from "../src/parser/mathjax-parser.js";
import { conceal } from "../src/editor_extensions/conceal_fns.js";
import { MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";
import { RawSnippetSchema } from "../src/snippets/parse.js";
import * as v from "valibot"

declare global {
	interface Window {
		__latex_suite_test_library: {
			plugin: LatexSuitePlugin;
			mdView: MarkdownView | null;
			view: EditorView | null;
		};
	}
}

EditorView.prototype.setDoc = function (text?: string, pos?: number) {
	const doc = this.state.doc;
	const transaction = this.state.update({
		changes: { from: 0, to: doc.length, insert: text ?? "" },
		selection: pos !== undefined ? { anchor: pos, head: pos } : undefined,
	});
	this.dispatch(transaction);
}
declare module "@codemirror/view" {
	interface EditorView {
		setDoc(text?: string, pos?: number): void;		
	}
}
export default class TestPlugin extends LatexSuitePlugin {
	test = {
		parser: fullMathParser,
		conceal,
	}	
	async onload() {
		await super.onload();
		this.app.workspace.onLayoutReady(() => {
			this.setLib();
		})
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
			this.setLib();
		}))
	}
	
	setLib() {
		const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const view: EditorView | null = mdView?.editor?.activeCM ?? null;
		window.__latex_suite_test_library = {
			plugin: this,
			mdView,
			view,
		}
		// if (view) {
		// 	view.setDoc = (text?: string) => {
		// 		const doc = view.state.doc;
		// 		const transaction = view.state.update({
		// 			changes: { from: 0, to: doc.length, insert: text ?? "" },
		// 		});
		// 		view.dispatch(transaction);
		// 	}
		// }
	}
}


export type RawSnippet = v.InferInput<typeof RawSnippetSchema>;
