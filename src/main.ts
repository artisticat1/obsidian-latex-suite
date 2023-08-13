import { Plugin, Notice } from "obsidian";
import { LatexSuiteSettings, DEFAULT_SETTINGS, LatexSuiteProcessedSettings, processLatexSuiteSettings } from "./settings";
import { LatexSuiteSettingTab } from "./ui/settings_tab";

import { ctxAtViewPos } from "./snippets/context";

import { EditorView, ViewUpdate, tooltips } from "@codemirror/view";
import { Prec, Extension } from "@codemirror/state";

import { onFileCreate, onFileChange, onFileDelete, debouncedSetSnippetsFromFileOrFolder } from "./snippets/file_watch";
import { snippetInvertedEffects, handleUndoRedo } from "./snippets/snippets_cm";
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
import { iterateCM6 } from "./editor_helpers";
import { getLatexSuiteConfigExtension, getLatexSuiteConfigFromView, reconfigureLatexSuiteConfig } from "./snippets/config";
import { cursorTriggerStateField } from "./snippets/cursor_trigger_state_field";


export default class LatexSuitePlugin extends Plugin {
	settings: LatexSuiteSettings;
	processedSettings: LatexSuiteProcessedSettings;

	cursorTriggeredByChange = false;
	editorExtensions:Extension[] = [];

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LatexSuiteSettingTab(this.app, this));

		this.legacyEditorWarning();

		// Register keymaps
		this.registerEditorExtension(Prec.highest(EditorView.domEventHandlers({
			"keydown": this.onKeydown.bind(this)
		})));

		// Register editor extensions for config/settings
		this.registerEditorExtension(getLatexSuiteConfigExtension(this.processedSettings));


		// Register editor extensions required for snippets
		this.registerEditorExtension([markerStateField, tabstopsStateField, snippetQueueStateField, snippetInvertedEffects, cursorTriggerStateField]);
		this.registerEditorExtension(EditorView.updateListener.of(this.handleUpdate.bind(this)));


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


	handleUpdate(update: ViewUpdate) {
		const cursorTriggeredByChange = update.state.field(cursorTriggerStateField, false);

		// Remove all tabstops when the user manually moves the cursor (e.g. on mouse click; using arrow keys)
		if (update.selectionSet) {
			if (!cursorTriggeredByChange) {
				const pos = update.state.selection.main.head;

				if (!isInsideATabstop(pos, update.view) || isInsideLastTabstop(update.view)) {
					removeAllTabstops(update.view);
				}
			}
		}

		handleUndoRedo(update);
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
		this.processedSettings = processLatexSuiteSettings(this.settings);

		// TODO: Make this work with new settings
		// if (this.settings.loadSnippetsFromFile) {
		// 	// Use onLayoutReady so that we don't try to read the snippets file too early
		// 	this.app.workspace.onLayoutReady(() => {
		// 		debouncedSetSnippetsFromFileOrFolder(this);
		// 	});
		// }
		// else {
		// 	this.setSnippets(this.settings.snippets);
		// }

		if (this.settings.basicSettings.concealEnabled) this.enableExtension(concealPlugin.extension);
		if (this.settings.basicSettings.colorPairedBracketsEnabled) this.enableExtension(colorPairedBracketsPluginLowestPrec);
		if (this.settings.basicSettings.highlightCursorBracketsEnabled) this.enableExtension(highlightCursorBracketsPlugin.extension);
		if (this.settings.basicSettings.mathPreviewEnabled) {
			this.enableExtension(cursorTooltipField);
			this.enableExtension(cursorTooltipBaseTheme);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.processedSettings = processLatexSuiteSettings(this.settings);
		this.reconfigureLatexSuiteConfig();
	}

	reconfigureLatexSuiteConfig() {
		iterateCM6(this.app.workspace, (view) => {
			view.dispatch({
				effects: reconfigureLatexSuiteConfig(this.processedSettings)
			});
		})
	}


	addEditorCommands() {
		for (const command of getEditorCommands(this)) {
			this.addCommand(command);
		}
	}


	onKeydown(event: KeyboardEvent, view: EditorView) {
		const success = this.handleKeydown(event.key, event.shiftKey, event.ctrlKey || event.metaKey, view);

		if (success) event.preventDefault();
	}


	handleKeydown(key: string, shiftKey: boolean, ctrlKey: boolean, view: EditorView) {

		const settings = getLatexSuiteConfigFromView(view);
		const s = view.state.selection;
		const pos = s.main.to;
		const ranges = Array.from(s.ranges).reverse(); // Last to first

		const ctx = ctxAtViewPos(view, pos, ranges);
		// TODO(multisn8): remove this when the PR is done
		console.log(ctx);
		console.log(ctx.mode);

		let success = false;

		if (settings.basicSettings.snippetsEnabled) {

			// Allows Ctrl + z for undo, instead of triggering a snippet ending with z
			if (!ctrlKey) {
				try {
					success = runSnippets(ctx, key);
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

		if (settings.basicSettings.autofractionEnabled && ctx.mode.anyMath()) {
			if (key === "/") {
				success = runAutoFraction(ctx);

				if (success) return true;
			}
		}

		// TODO(multisn8): currently matrices in inline math are a mess either way
		// but with the block/inline distinction, maybe we could try to stuff them inline
		// or "switch" to a block from inline if a matrix env is activated?
		if (settings.basicSettings.matrixShortcutsEnabled && ctx.mode.blockMath) {
			if (["Tab", "Enter"].contains(key)) {
				success = runMatrixShortcuts(ctx, key, shiftKey);

				if (success) return true;
			}
		}

		if (settings.basicSettings.taboutEnabled) {
			if (key === "Tab") {
				success = tabout(view, ctx.mode.anyMath());

				if (success) return true;
			}
		}

		return false;
	}


	handleTabstops(view: EditorView):boolean {
		const success = consumeAndGotoNextTabstop(view);

		return success;
	}
}