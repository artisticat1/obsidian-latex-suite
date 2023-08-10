import { Plugin, Notice } from "obsidian";
import { LatexSuiteSettings, LatexSuiteSettingTab, DEFAULT_SETTINGS } from "./settings";

import { ctxAtViewPos } from "./snippets/options";

import { EditorView, ViewUpdate, tooltips } from "@codemirror/view";
import { Prec, Extension } from "@codemirror/state";

import { Environment, ParsedSnippet } from "./snippets/snippets";
import { onFileCreate, onFileChange, onFileDelete, debouncedSetSnippetsFromFileOrFolder } from "./snippets/file_watch";
import { sortSnippets, getSnippetsFromString, snippetInvertedEffects, handleUndoRedo } from "./snippets/snippet_helper_functions";
import { isInsideATabstop, isInsideLastTabstop, removeAllTabstops, consumeAndGotoNextTabstop } from "./snippets/snippet_management";
import { markerStateField } from "./snippets/marker_state_field";
import { tabstopsStateField } from "./snippets/tabstops_state_field";
import { clearSnippetQueue, snippetQueueStateField } from "./snippets/snippet_queue_state_field";

import { concealPlugin } from "./editor_extensions/conceal";
import { colorPairedBracketsPluginLowestPrec, highlightCursorBracketsPlugin } from "./editor_extensions/highlight_brackets";
import { cursorTooltipBaseTheme, cursorTooltipField } from "./editor_extensions/math_tooltip";

import { runSnippets } from "./features/run_snippets";
import { runAutoFraction } from "./features/autofraction";
import { tabout, shouldTaboutByCloseBracket } from "./features/tabout";
import { runMatrixShortcuts } from "./features/matrix_shortcuts";
import { getEditorCommands } from "./features/editor_commands";


export default class LatexSuitePlugin extends Plugin {
	settings: LatexSuiteSettings;
	snippets: ParsedSnippet[];
	autofractionExcludedEnvs: Environment[];
	matrixShortcutsEnvNames: string[];
	autoEnlargeBracketsTriggers: string[];
	ignoreMathLanguages: string[];
	forceMathLanguages: string[];

	private cursorTriggeredByChange = false;
	private editorExtensions:Extension[] = [];


	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LatexSuiteSettingTab(this.app, this));

		this.legacyEditorWarning();

		// Register keymaps
		this.registerEditorExtension(Prec.highest(EditorView.domEventHandlers({
			"keydown": this.onKeydown
		})));


		// Register editor extensions required for snippets
		this.registerEditorExtension([markerStateField, tabstopsStateField, snippetQueueStateField, snippetInvertedEffects]);
		this.registerEditorExtension(EditorView.updateListener.of(this.handleUpdate));


		// Register editor extensions for editor enhancements
		this.registerEditorExtension(tooltips({position: "absolute"}));
		this.registerEditorExtension(this.editorExtensions);
		

		// Watch for changes to the snippets file
		this.registerEvent(this.app.vault.on("modify", (file) => onFileChange(this, file)));
		this.registerEvent(this.app.vault.on("delete", (file) => onFileDelete(this, file)));
		this.registerEvent(this.app.vault.on("create", (file) => onFileCreate(this, file)));


		this.addEditorCommands();
	}


	onunload() {

	}


	legacyEditorWarning() {
		if ((this.app.vault as any).config?.legacyEditor) {
			const message = "Obsidian Latex Suite: This plugin does not support the legacy editor. Switch to Live Preview mode to use this plugin.";

			new Notice(message, 100000);
			console.log(message);

			return;
		}
	}


	private readonly handleUpdate = (update: ViewUpdate) => {
		if (update.docChanged) {
			this.handleDocChange();
		}

		if (update.selectionSet) {
			const pos = update.state.selection.main.head;
			this.handleCursorActivity(update.view, pos);
		}

		handleUndoRedo(update);
	}


	private readonly handleDocChange = () => {
		this.cursorTriggeredByChange = true;
	}


	private readonly handleCursorActivity = (view: EditorView, pos: number) => {
		if (this.cursorTriggeredByChange) {
			this.cursorTriggeredByChange = false;
			return;
		}

		if (!isInsideATabstop(pos, view) || isInsideLastTabstop(view)) {
			removeAllTabstops(view);
		}
	}


	enableExtension(extension: Extension) {
		this.editorExtensions.push(extension);
		this.app.workspace.updateOptions();

	}


	disableExtension(extension: Extension) {
		this.editorExtensions.remove(extension);
		this.app.workspace.updateOptions();
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		if (this.settings.loadSnippetsFromFile) {
			// Use onLayoutReady so that we don't try to read the snippets file too early
			this.app.workspace.onLayoutReady(() => {
				debouncedSetSnippetsFromFileOrFolder(this);
			});
		}
		else {
			this.setSnippets(this.settings.snippets);
		}

		this.setAutofractionExcludedEnvs(this.settings.autofractionExcludedEnvs);
		this.matrixShortcutsEnvNames = this.settings.matrixShortcutsEnvNames.replace(/\s/g,"").split(",");
		this.autoEnlargeBracketsTriggers = this.settings.autoEnlargeBracketsTriggers.replace(/\s/g,"").split(",");
		this.ignoreMathLanguages = this.settings.ignoreMathLanguages.replace(/\s/g,"").split(",");
		this.forceMathLanguages = this.settings.forceMathLanguages.replace(/\s/g,"").split(",");


		if (this.settings.concealEnabled) this.enableExtension(concealPlugin.extension);
		if (this.settings.colorPairedBracketsEnabled) this.enableExtension(colorPairedBracketsPluginLowestPrec);
		if (this.settings.highlightCursorBracketsEnabled) this.enableExtension(highlightCursorBracketsPlugin.extension);
		if (this.settings.mathPreviewEnabled) {
			this.enableExtension(cursorTooltipField);
			this.enableExtension(cursorTooltipBaseTheme);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	setSnippets(snippetsStr: string) {
		const snippets = getSnippetsFromString(snippetsStr);

		sortSnippets(snippets);
		this.snippets = snippets;
	}


	setAutofractionExcludedEnvs(envsStr: string) {
		const envsJSON = JSON.parse(envsStr);
		const envs = envsJSON.map(function(env: string[]) {
			return {openSymbol: env[0], closeSymbol: env[1]};
		});

		this.autofractionExcludedEnvs = envs;
	}



	private readonly addEditorCommands = () => {
		for (const command of getEditorCommands(this)) {
			this.addCommand(command);
		}
	}


	private readonly onKeydown = (event: KeyboardEvent, view: EditorView) => {
		const success = this.handleKeydown(event.key, event.shiftKey, event.ctrlKey || event.metaKey, view);

		if (success) event.preventDefault();
	}


	private readonly handleKeydown = (key: string, shiftKey: boolean, ctrlKey: boolean, view: EditorView) => {

		const s = view.state.selection;
		const pos = s.main.to;
		const ranges = Array.from(s.ranges).reverse(); // Last to first

		const ctx = ctxAtViewPos(view, pos, this);
		// TODO(multisn8): <-- remove this when the PR is done
		console.log(ctx);  
		console.log(ctx.mode);

		let success = false;

		if (this.settings.snippetsEnabled) {

			// Allows Ctrl + z for undo, instead of triggering a snippet ending with z
			if (!ctrlKey) {
				try {
					success = runSnippets(view, key, ctx, ranges, this);
					if (success) return true;
				}
				catch (e) {
					clearSnippetQueue(view);
					console.error(e);
				}

			}

		}

		const taboutByCloseBracket = shouldTaboutByCloseBracket(view, key);

		if (key === "Tab" || taboutByCloseBracket) {
			success = this.handleTabstops(view);

			if (success) return true;
		}

		if (this.settings.autofractionEnabled && ctx.mode.anyMath()) {
			if (key === "/") {
				success = runAutoFraction(view, ranges, this);

				if (success) return true;
			}
		}

		// TODO(multisn8): currently matrices in inline math are a mess either way
		// but with the block/inline distinction, maybe we could try to stuff them inline
		// or "switch" to a block from inline if a matrix env is activated?
		if (this.settings.matrixShortcutsEnabled && ctx.mode.blockMath) {
			if (["Tab", "Enter"].contains(key)) {
				success = runMatrixShortcuts(view, key, shiftKey, pos, this.matrixShortcutsEnvNames);

				if (success) return true;
			}
		}

		if (this.settings.taboutEnabled) {
			if (key === "Tab") {
				success = tabout(view, ctx.mode.anyMath());

				if (success) return true;
			}
		}

		return false;
	}


	private readonly handleTabstops = (view: EditorView):boolean => {
		const success = consumeAndGotoNextTabstop(view);

		return success;
	}
}
