import LatexSuitePlugin from "../src/main";
import { fullMathParser } from "../src/parser/mathjax-parser";
import { conceal } from "../src/editor_extensions/conceal_fns";
import { editorLivePreviewField, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";
import { RawSnippetSchema } from "../src/snippets/parse";
import * as v from "valibot"
import { colorPairedBrackets, colorPairedBracketsPlugin } from "../src/editor_extensions/highlight_brackets";
import i18next from "../src/i18n/i18n";
import { settings_translation } from "../src/i18n/i18n";
import type {} from "../src/i18n/i18next";
import { Language, LRLanguage } from "@codemirror/language";
import { parser } from "./math-only-parser";
import { minimalSetup } from "codemirror";
import { getContextPlugin } from "../src/editor_context/context";
import { getLatexSuiteConfig } from "../src/snippets/codemirror/config";
import { serializeSnippetLike } from "../src/snippets/snippets";
import { DEFAULT_SETTINGS } from "../src/settings/settings";

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
		conceal: (view: EditorView) => conceal(view, {}, getLatexSuiteConfig(view).concealMaps), 
		getContextPlugin,
		colorPairedBrackets,
		settings_translation,
		i18next,
		EditorView,
		DEFAULT_SETTINGS
	} as const;	
	async onload() {
		await super.onload();
		this.app.workspace.onLayoutReady(() => {
			this.setLib();
		})
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
			this.setLib();
		}))
	}
	
	createExcalidrawView() {
		const extensions = [
			LRLanguage.define({parser}),
			minimalSetup,
			editorLivePreviewField.init(() => false),
			EditorView.editorAttributes.of({ class: "multi-select-container" }),
			this.editorExtensions,
		]
		const view = new EditorView({
			extensions,
		})
		return view;
	}
	
	createNormalView(doc: string) {
		const extensions = [
			LRLanguage.define({parser, name: "hypermd"}),
			minimalSetup,
			editorLivePreviewField.init(() => false),
			EditorView.editorAttributes.of({ class: "multi-select-container" }),
			this.editorExtensions,
		]
		const view = new EditorView({
			extensions,
			doc
		})
		return view;
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
	
	serializeSnippets() {
		const snippets = this.CMSettings.snippets.all;
		return snippets.map(serializeSnippetLike)
	}
}


export type RawSnippet = v.InferInput<typeof RawSnippetSchema>;
