import { Extension } from "@codemirror/state";
import { Plugin, Notice, loadMathJax, addIcon } from "obsidian";
import { onFileCreate, onFileChange, onFileDelete, getSnippetsWithinFileOrFolder } from "./settings/file_watch";
import { LatexSuitePluginSettings, DEFAULT_SETTINGS, LatexSuiteCMSettings, processLatexSuiteSettings } from "./settings/settings";
import { LatexSuiteSettingTab } from "./settings/settings_tab";
import { ICONS } from "./settings/ui/icons";

import { getEditorCommands } from "./features/editor_commands";
import { iterateCM6 } from "./utils/editor_utils";
import { reconfigureLatexSuiteConfig } from "./snippets/codemirror/config";
import { parseSnippets } from "./snippets/parse_snippets";
import type { Snippet } from "./snippets/snippets";
import { latexSuiteExtensions, optionalExtensions } from "./latex_suite";
import { getSnippetVariables } from "./snippets/snippet_variables";

export default class LatexSuitePlugin extends Plugin {
	settings: LatexSuitePluginSettings;
	CMSettings: LatexSuiteCMSettings;
	editorExtensions:Extension[] = [];

	async onload() {
		await this.loadSettings();

		this.loadIcons();
		this.addSettingTab(new LatexSuiteSettingTab(this.app, this));
		loadMathJax();

		this.legacyEditorWarning();

		// Register Latex Suite extensions and optional editor extensions for editor enhancements
		this.registerEditorExtension(this.editorExtensions);

		// Watch for changes to the snippets file
		this.watchSnippetFiles();

		this.addEditorCommands();
	}

	onunload() {

	}

	legacyEditorWarning() {
		// @ts-ignore
		if (this.app.vault.config?.legacyEditor) {
			const message = "Obsidian Latex Suite: This plugin does not support the legacy editor. Switch to Live Preview mode to use this plugin.";

			new Notice(message, 100000);
			console.log(message);

			return;
		}
	}

	async loadSettings() {
		let data = await this.loadData();

		// Migrate settings from v1.8.0 - v1.8.4
		const shouldMigrateSettings = data ? "basicSettings" in data : false;

		// @ts-ignore
		function migrateSettings(oldSettings) {
			return {
				...oldSettings.basicSettings,
				...oldSettings.rawSettings,
				snippets: oldSettings.snippets,
			};
		}

		if (shouldMigrateSettings) {
			data = migrateSettings(data);
		}

		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

		if (shouldMigrateSettings) {
			this.saveSettings();
		}

		if (this.settings.loadSnippetsFromFile) {
			const tempSnippetVariables = getSnippetVariables(this.settings.snippetVariables);

			let tempSnippets: Snippet[] = [];
			try {
				tempSnippets = await parseSnippets(this.settings.snippets, tempSnippetVariables);
			} catch (e) {
				new Notice(`Failed to load snippets:\n${e}`);
				console.log("Failed to load snippets:\n", e);
			}

			this.CMSettings = processLatexSuiteSettings(tempSnippets, this.settings);

			// Use onLayoutReady so that we don't try to read the snippets file too early
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
		const snippetVariables = getSnippetVariables(this.settings.snippetVariables);

		if (!this.settings.loadSnippetsFromFile) {
			let snippets: Snippet[] = [];
			try {
				snippets = await parseSnippets(this.settings.snippets, snippetVariables);
			} catch (e) {
				new Notice("Failed to load snippets from settings");
				console.log("Failed to load snippets from settings:", e);
			}
			return snippets;
		}
		else {
			const snippets = await getSnippetsWithinFileOrFolder(this.app.vault, this.settings.snippetsFileLocation, snippetVariables);

			return snippets;
		}
	}

	async processSettings() {
		this.CMSettings = processLatexSuiteSettings(await this.getSnippets(), this.settings);
		this.reconfigureLatexSuiteConfig();
		this.refreshCMExtensions();
	}

	reconfigureLatexSuiteConfig() {
		iterateCM6(this.app.workspace, (view) => {
			view.dispatch({
				effects: reconfigureLatexSuiteConfig(this.CMSettings)
			});
		})
	}

	refreshCMExtensions() {
		// Remove all currently loaded CM extensions
		while (this.editorExtensions.length) this.editorExtensions.pop();

		// Load Latex Suite extensions
		this.editorExtensions.push(latexSuiteExtensions(this.CMSettings));

		// Load optional CM extensions according to plugin settings
		const extensionDict = optionalExtensions;
		const features = Object.keys(optionalExtensions);

		for (const feature of features) {
			// @ts-ignore
			if (this.CMSettings[feature + "Enabled"]) {
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

	watchSnippetFiles() {
		const eventsAndCallbacks = {
			"modify": onFileChange,
			"delete": onFileDelete,
			"create": onFileCreate
		};

		for (const [key, value] of Object.entries(eventsAndCallbacks)) {
			// @ts-expect-error
			this.registerEvent(this.app.vault.on(key, (file) => value(this, file)));
		}
	}

	loadIcons() {
		for (const [iconId, svgContent] of Object.entries(ICONS)) {
			addIcon(iconId, svgContent);
		}
	}
}
