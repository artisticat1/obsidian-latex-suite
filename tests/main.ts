import LatexSuitePlugin from "../src/main";
import { fullMathParser } from "../src/parser/mathjax-parser";
import { conceal } from "../src/editor_extensions/conceal_fns";
import { Editor, editorLivePreviewField, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";
import { parseSnippet, RawSnippetSchema, validateRawSnippets } from "../src/snippets/parse";
import * as v from "valibot"
import { colorPairedBrackets } from "../src/editor_extensions/highlight_brackets";
import i18next from "../src/i18n/i18n";
import { settings_translation } from "../src/i18n/i18n";
import type {} from "../src/i18n/i18next";
import { LRLanguage } from "@codemirror/language";
import { parser } from "./math-only-parser";
import { minimalSetup } from "codemirror";
import { getContextPlugin } from "../src/editor_context/context";
import { getLatexSuiteConfig } from "../src/snippets/codemirror/config";
import { serializeSnippetLike, Snippet } from "../src/snippets/snippets";
import { DEFAULT_SETTINGS } from "../src/settings/settings";
import { tabstopsStateField } from "../src/snippets/codemirror/tabstops_state_field";
import { Mode, Options } from "../src/editor_context/options";

declare global {
	interface Window {
		__latex_suite_test_library: {
			plugin: LatexSuitePlugin;
			mdView: MarkdownView | null;
			view: EditorView | null;
			editor: Editor | null;
		};
	}
}

declare module "../src/snippets/snippets" {
	interface Snippet {
		toJSON(): ReturnType<typeof snippetToJSON>;
	}
}

// declare module "../src/"
declare module "../src/editor_context/options" {
	interface Options {
		toJSON(): ReturnType<typeof optionsToJSON>;
	}
	interface Mode {
		toJSON(): ReturnType<typeof modeToJSON>;
	}
}

const modeToJSON = (obj: Mode) => {
	const { blockMath, code, codeBlock, codeMath, snippetlessEnv, text,textEnv  } = obj;
	return {
		blockMath,
		code,
		codeBlock,
		codeMath,
		snippetlessEnv,
		text,
		textEnv
	};
}

const optionsToJSON = (obj: Options) => {
	const {
		mode,
		automatic,
		regex,
		onWordBoundary,
		visual,
		undoKey,
		// includedPaths
	} = obj;
	return {
		mode: mode.toJSON(),
		automatic,
		regex,
		onWordBoundary,
		visual,
		undoKey,
		// includedPaths: includedPaths.toJSON(),
	};
}

const snippetToJSON = (obj: Snippet) => {
	const {
		type,
		trigger,
		options,
		replacement,
		priority,
		description,
		context,
		excludedEnvironments,
		includedMacros,
		triggerKey,
		excludedMacros,	
	} = obj;
	return {
		type,
		priority,
		description,
		context,
		excludedEnvironments,
		includedMacros,
		triggerKey,
		excludedMacros,
		trigger:
			trigger instanceof RegExp ? trigger.source : trigger,
		options: options.toJSON(),
	};
}

Snippet.prototype.toJSON = function() {
	return snippetToJSON(this);
}
Options.prototype.toJSON = function() {
	return optionsToJSON(this);
}
Mode.prototype.toJSON = function() {
	return modeToJSON(this);
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
		DEFAULT_SETTINGS,
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
		const editor: Editor | null = mdView?.editor ?? null;
		const view: EditorView | null = editor?.activeCM ?? null;
		window.__latex_suite_test_library = {
			plugin: this,
			mdView,
			view,
			editor
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
	
	async setSnippets(snippets: RawSnippet[]) {
		this.CMSettings.snippets.all = validateRawSnippets(snippets).flatMap((raw) => parseSnippet(raw, this.CMSettings.snippetVariables));
		await this.saveSettings();
	}
	
	serializeSnippets() {
		const snippets = this.CMSettings.snippets.all;
		return snippets.map(serializeSnippetLike)
	}
	
	throwIfAnyTabstops(view: EditorView) {
		const tabstops = view.state.field(tabstopsStateField, false);
		if (!tabstops) {
			return;
		}
		if (tabstops.tabstopGroups.length > 0 || tabstops.index > 0) {
			console.error({
				index: tabstops.index,
				tabstopGroups: tabstops.tabstopGroups.map(g => g.copy()),
				color: tabstops.color,
			});
			throw new Error(`There are still tabstops in the editor: length=${tabstops.tabstopGroups.length}, index=${tabstops.index}, color=${tabstops.color}`);
		}
	}
}


export type RawSnippet = v.InferInput<typeof RawSnippetSchema>;
