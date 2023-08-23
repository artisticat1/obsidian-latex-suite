import { Extension } from "@codemirror/state";
import { Plugin, Notice, loadMathJax } from "obsidian";
import { onFileCreate, onFileChange, onFileDelete, getSnippetsWithinFileOrFolder } from "./settings/file_watch";
import { LatexSuiteSettings, DEFAULT_SETTINGS, LatexSuiteProcessedSettings, processLatexSuiteSettings } from "./settings/settings";
import { LatexSuiteSettingTab } from "./settings/settings_tab";

import { getEditorCommands } from "./features/editor_commands";
import { iterateCM6 } from "./utils/editor_utils";
import { reconfigureLatexSuiteConfig } from "./snippets/codemirror/config";
import { latexSuiteExtensions, optionalExtensions } from "./latex_suite";
import { parseSnippets } from "./snippets/parse_snippets";

export default class LatexSuitePlugin extends Plugin {
	settings: LatexSuiteSettings;
	processedSettings: LatexSuiteProcessedSettings;
	editorExtensions:Extension[] = [];

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LatexSuiteSettingTab(this.app, this));
		loadMathJax();

		this.legacyEditorWarning();

		// Register Latex Suite extensions
		this.registerEditorExtension(latexSuiteExtensions(this.processedSettings));

		// Register optional editor extensions for editor enhancements
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		if (this.settings.basicSettings.loadSnippetsFromFile) {
			// Use onLayoutReady so that we don't try to read the snippets file too early
			this.processedSettings = processLatexSuiteSettings(parseSnippets(this.settings.snippets), this.settings);

			this.app.workspace.onLayoutReady(() => {
				this.processSettings();
			});
		}
		else {
			await this.processSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.processSettings();
	}

	async getSnippets() {
		if (!this.settings.basicSettings.loadSnippetsFromFile) {
			return parseSnippets(this.settings.snippets);
		}
		else {
			const snippets = await getSnippetsWithinFileOrFolder(this.settings.basicSettings.snippetsFileLocation);

			return snippets;
		}
	}

	async processSettings() {
		this.processedSettings = processLatexSuiteSettings(await this.getSnippets(), this.settings);
		this.reconfigureLatexSuiteConfig();
		this.refreshCMExtensions();
	}

	reconfigureLatexSuiteConfig() {
		iterateCM6(this.app.workspace, (view) => {
			view.dispatch({
				effects: reconfigureLatexSuiteConfig(this.processedSettings)
			});
		})
	}

	refreshCMExtensions() {
		// Remove all currently loaded CM extensions
		while (this.editorExtensions.length) this.editorExtensions.pop();

		// Load CM extensions according to plugin settings
		const extensionDict = optionalExtensions;
		const features = Object.keys(optionalExtensions);

		for (const feature of features) {
			// @ts-ignore
			if (this.processedSettings.basicSettings[feature + "Enabled"]) {
				this.editorExtensions.push(extensionDict[feature]);
			}
		}
		this.app.workspace.updateOptions();
	}

	addEditorCommands() {
		for (const command of getEditorCommands(this)) {
			this.addCommand(command);
		}
	}
}
