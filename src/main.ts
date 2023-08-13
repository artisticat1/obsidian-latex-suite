import { Plugin, Notice } from "obsidian";
import { LatexSuiteSettings, DEFAULT_SETTINGS, LatexSuiteProcessedSettings, processLatexSuiteSettings } from "./settings";
import { LatexSuiteSettingTab } from "./ui/settings_tab";

import { EditorView, tooltips } from "@codemirror/view";
import { Prec, Extension } from "@codemirror/state";

import { onFileCreate, onFileChange, onFileDelete, debouncedSetSnippetsFromFileOrFolder } from "./snippets/file_watch";
import { snippetInvertedEffects } from "./snippets/snippets_cm";
import { markerStateField } from "./snippets/marker_state_field";
import { tabstopsStateField } from "./snippets/tabstops_state_field";
import { snippetQueueStateField } from "./snippets/snippet_queue_state_field";

import { concealPlugin } from "./editor_extensions/conceal";
import { colorPairedBracketsPluginLowestPrec, highlightCursorBracketsPlugin } from "./editor_extensions/highlight_brackets";
import { cursorTooltipBaseTheme, cursorTooltipField } from "./editor_extensions/math_tooltip";

import { getEditorCommands } from "./features/editor_commands";
import { iterateCM6 } from "./editor_helpers";
import { getLatexSuiteConfigExtension, reconfigureLatexSuiteConfig } from "./snippets/config";
import { cursorTriggerStateField } from "./snippets/cursor_trigger_state_field";
import { onKeydown, handleUpdate } from "./latex_suite";


export default class LatexSuitePlugin extends Plugin {
	settings: LatexSuiteSettings;
	processedSettings: LatexSuiteProcessedSettings;

	editorExtensions:Extension[] = [];

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LatexSuiteSettingTab(this.app, this));

		this.legacyEditorWarning();

		// Register keymaps
		this.registerEditorExtension(Prec.highest(EditorView.domEventHandlers({
			"keydown": onKeydown
		})));

		// Register editor extensions for config/settings
		this.registerEditorExtension(getLatexSuiteConfigExtension(this.processedSettings));


		// Register editor extensions required for snippets
		this.registerEditorExtension([markerStateField, tabstopsStateField, snippetQueueStateField, snippetInvertedEffects, cursorTriggerStateField]);
		this.registerEditorExtension(EditorView.updateListener.of(handleUpdate));


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
}
