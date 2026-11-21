import { EditorView } from "@codemirror/view";
import { App, Component, Notice, Platform, PluginSettingTab, Setting, type SettingDefinitionItem, debounce, requireApiVersion, setIcon } from "obsidian";
import { parseSnippetVariables, parseSnippets } from "src/snippets/parse";
import LatexSuitePlugin from "../main";
import { DEFAULT_SETTINGS, validateTextMacros, type LatexSuitePluginSettings } from "./settings";
import { FileSuggest } from "./ui/file_suggest";
import { getVimSelectModeCommand, type vimCommand, getVimVisualModeCommand, getVimEditorCommands, getVimRunMatrixEnterCommand } from "src/features/editor_commands";
import { createSnippetsEditor, LatexSuiteSettingsTab2, renderHtml } from "./settings_tab2";
import { settings_translation as t } from "../i18n/i18n"
import { MappingSchema } from "src/editor_extensions/conceal_maps";
import * as v from "valibot";
import { hasOwn } from "src/utils/editor_utils";


export class LatexSuiteSettingTab extends PluginSettingTab {
	plugin: LatexSuitePlugin;
	snippetsEditor: EditorView | null = null;
	snippetVariablesEditor: EditorView | null = null;
	textMacrosEditor: EditorView | null = null;
	concealMapsEditor: EditorView | null = null;
	snippetsFileLocEl: HTMLElement | undefined = undefined;
	snippetVariablesFileLocEl: HTMLElement | undefined = undefined;
	component = new Component()

	constructor(app: App, plugin: LatexSuitePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide() {
		this.snippetsEditor?.destroy();
		this.snippetVariablesEditor?.destroy();
		this.concealMapsEditor?.destroy();
		this.textMacrosEditor?.destroy();
		
	}
	async setControlValue(key: string, value: unknown): Promise<void> {
		if (!hasOwn(DEFAULT_SETTINGS, key)) {
			console.error(`Invalid setting key: ${key}`);
			return;
		}
		const settings = this.plugin.settings as unknown as Record<string, unknown>
		settings[key] = value;
		const verifiedKey = key as keyof LatexSuitePluginSettings;
		const didFileLocationChange = verifiedKey === "loadSnippetsFromFile" || verifiedKey === "loadSnippetVariablesFromFile";
		await this.plugin.saveSettings(didFileLocationChange, false);
		if (didFileLocationChange && settings[key] !== value) {
			settings[key] = value;
			await this.plugin.saveSettings();
		}
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const updater = () => {
			if (requireApiVersion("1.13.0")) {
				this.update();
			}
		}
		return new LatexSuiteSettingsTab2(this.app, this.plugin, updater).getSettingDefinitions();
	}

	addHeading(containerEl: HTMLElement, name: string, icon = "math") {
		const heading = new Setting(containerEl).setName(name).setHeading();

		const parentEl = heading.settingEl;
		parentEl.addClass("latex-suite-settings-heading");
		const iconEl = parentEl.createDiv();
		setIcon(iconEl, icon);
		iconEl.addClass("latex-suite-settings-icon");

		parentEl.prepend(iconEl);
		return heading;
	}


	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.component.unload();

		this.displaySnippetSettings();
		this.displayConcealSettings();
		this.displayColorHighlightBracketsSettings();
		this.displayPopupPreviewSettings();
		this.displayAutofractionSettings();
		this.displayMatrixShortcutsSettings();
		this.displayTaboutSettings();
		this.displayAutoEnlargeBracketsSettings();
		this.displayAdvancedSnippetSettings();
		this.displayKeymapSettings();
		this.displayExperimentalSettings();
		this.component.load();
	}

	private displaySnippetSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("snippets.heading"), "ballpen");

		new Setting(containerEl)
			.setName(t("snippets.enabled.name"))
			.setDesc(this.renderHtml(t("snippets.enabled.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.snippetsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.snippetsEnabled = value;
					await this.plugin.saveSettings();
				}));


		const snippetsSetting = new Setting(containerEl)
			.setName(t("snippets.snippets.name"))
			.setDesc(this.renderHtml(t("snippets.snippets.desc")))
			.setClass("snippets-text-area");


		this.snippetsEditor = createSnippetsEditor(snippetsSetting, this.plugin, {
			type: "snippets",
			validate: async (value) => {
				await parseSnippets(value, this.plugin.CMSettings.snippetVariables, "snippets.js", this.plugin.pluginSnippetApi);
			}
		});


		new Setting(containerEl)
			.setName(t("snippets.load-from-file.name"))
			.setDesc(this.renderHtml(t("snippets.load-from-file.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.loadSnippetsFromFile)
				.onChange(async (value) => {
					this.plugin.settings.loadSnippetsFromFile = value;

					snippetsSetting.settingEl.toggleClass("hidden", value);
					if (this.snippetsFileLocEl != undefined)
						this.snippetsFileLocEl.toggleClass("hidden", !value);

					await this.plugin.saveSettings(true);
				}));


		const snippetsFileLocDesc = new DocumentFragment();
		snippetsFileLocDesc.createDiv({}, div => {
			div.appendText(t("snippets.file-path.desc"));
		});

		const snippetsFileLoc = new Setting(containerEl)
			.setName(t("snippets.file-path.name"))
			.setDesc(snippetsFileLocDesc);

		let inputEl;
		snippetsFileLoc.addSearch(component => {
			component
				.setPlaceholder(DEFAULT_SETTINGS.snippetsFileLocation)
				.setValue(this.plugin.settings.snippetsFileLocation)
				.onChange(debounce(async (value) => {
					this.plugin.settings.snippetsFileLocation = value;
					await this.plugin.saveSettings(true);
				}, 500, true));

			inputEl = component.inputEl;
			inputEl.addClass("latex-suite-location-input-el");
			new FileSuggest(this.app, inputEl);
		});

		this.snippetsFileLocEl = snippetsFileLoc.settingEl;


		// Hide settings that are not relevant when "loadSnippetsFromFile" is set to true/false
		const loadSnippetsFromFile = this.plugin.settings.loadSnippetsFromFile;
		snippetsSetting.settingEl.toggleClass("hidden", loadSnippetsFromFile);
		this.snippetsFileLocEl.toggleClass("hidden", !loadSnippetsFromFile);

	}

	private displayConcealSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("conceal.heading"), "math-integral-x");

		const fragment = renderHtml(t("conceal.enabled.desc"))
		new Setting(containerEl)
			.setName(t("conceal.enabled.name"))
			.setDesc(fragment)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.concealEnabled)
				.onChange(async (value) => {
					this.plugin.settings.concealEnabled = value;
					await this.plugin.saveSettings();
				})
			);

		const fragment2 = renderHtml(t("conceal.reveal-delay.desc"))
		new Setting(containerEl)
			.setName(t("conceal.reveal-delay.name"))
			.setDesc(fragment2)
			.addText(text => text
				.setPlaceholder(String(DEFAULT_SETTINGS.concealRevealTimeout))
				.setValue(String(this.plugin.settings.concealRevealTimeout))
				.onChange(value => {
					// Make sure the value is a non-negative integer
					const ok = /^\d+$/.test(value);
					if (ok) {
						this.plugin.settings.concealRevealTimeout = Number(value);
						void this.plugin.saveSettings();
					}
				})
			);

		const concealMapsSetting = new Setting(containerEl)
			.setName(t("conceal.conceal-maps.name"))
			.setDesc(this.renderHtml(t("conceal.conceal-maps.desc")))
		this.concealMapsEditor = createSnippetsEditor(concealMapsSetting, this.plugin, {
			type: "concealMaps",
			validate: async (value) => {
				const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), MappingSchema), value)
				if (parsed.success) {
					return
				}
				return parsed.issues.map(issue => issue.message)
			}
		})
	}

	private displayColorHighlightBracketsSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("highlight-brackets.heading"), "parentheses");

		new Setting(containerEl)
			.setName(t("highlight-brackets.color-brackets.name"))
			.setDesc(this.renderHtml(t("highlight-brackets.color-brackets.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.colorPairedBracketsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.colorPairedBracketsEnabled = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName(t("highlight-brackets.highlight-brackets.name"))
			.setDesc(this.renderHtml(t("highlight-brackets.highlight-brackets.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.highlightCursorBracketsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.highlightCursorBracketsEnabled = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName(t("highlight-brackets.color-math.name"))
			.setDesc(this.renderHtml(t("highlight-brackets.color-math.desc")))
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.highlightDollarEnabled)
				.onChange(async (value) => {
					this.plugin.settings.highlightDollarEnabled = value;
					await this.plugin.saveSettings();
				})
			);
	}

	private displayPopupPreviewSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("math-preview.heading"), "superscript");

		const mathPreviewSetting = new Setting(containerEl)
			.setName(t("math-preview.enabled.name"))
			.setDesc(this.renderHtml(t("math-preview.enabled.desc")))

		const positionSetting = new Setting(containerEl)
			.setName(t("math-preview.position.name"))
			.setDesc(this.renderHtml(t("math-preview.position.desc")))
			.addDropdown((dropdown) => dropdown
				.addOption("Above", t("math-preview.position.options.above"))
				.addOption("Below", t("math-preview.position.options.below"))
				.setValue(this.plugin.settings.mathPreviewPositionIsAbove ? "Above" : "Below")
				.onChange(async (value) => {
					this.plugin.settings.mathPreviewPositionIsAbove = (value === "Above");
					await this.plugin.saveSettings();
				})
			);
		const cursorSetting = new Setting(containerEl)
			.setName(t("math-preview.cursor-symbol.name"))
			.setDesc(this.renderHtml(t("math-preview.cursor-symbol.desc", { cursor: DEFAULT_SETTINGS.mathPreviewCursor })))
			.addText(text => {
				text
					.setPlaceholder(DEFAULT_SETTINGS.mathPreviewCursor)
					.setValue(this.plugin.settings.mathPreviewCursor)
					.onChange(async (value) => {
						this.plugin.settings.mathPreviewCursor = value;
						await this.plugin.saveSettings();
					});

				const datalist = containerEl.createEl("datalist", {attr: { id: "math-preview-cursor-list" }});
				["▶", "┃", "|", "\\_", "{\\mid}", "{\\triangle}"].forEach(s => datalist.createEl("option", { value: s }));
				text.inputEl.setAttribute("list", "math-preview-cursor-list");
				return text;
			});

		const highlightSetting = new Setting(containerEl)
			.setName(t("math-preview.highlight-brackets.name"))
			.setDesc(this.renderHtml(t("math-preview.highlight-brackets.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.mathPreviewBracketHighlighting)
				.onChange(async (value) => {
					this.plugin.settings.mathPreviewBracketHighlighting = value;
					await this.plugin.saveSettings();
				}));

		const livePreviewDisplay = new Setting(containerEl)
			.setName(t("math-preview.display-live-preview.name"))
			.setDesc(this.renderHtml(t("math-preview.display-live-preview.desc")))
			.addToggle((toggle) =>
				toggle
				.setValue(this.plugin.settings.mathPreviewLivePreviewDisplay)
				.onChange(async (value) => {
					this.plugin.settings.mathPreviewLivePreviewDisplay =
						value;
					await this.plugin.saveSettings();
				}));

		const mathPreviewDependentSettings = [positionSetting, cursorSetting, highlightSetting, livePreviewDisplay];
		mathPreviewDependentSettings.forEach((setting) =>
			setting.settingEl.toggleClass(
				"hidden",
				!this.plugin.settings.mathPreviewEnabled,
			),
		);

		mathPreviewSetting.addToggle(toggle =>
			toggle
				.setValue(this.plugin.settings.mathPreviewEnabled)
				.onChange(async (value) => {
					this.plugin.settings.mathPreviewEnabled = value;
					mathPreviewDependentSettings.forEach((setting) =>
						setting.settingEl.toggleClass("hidden", !value),
					);
					await this.plugin.saveSettings();
				}));
	}

	private displayAutofractionSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("auto-fraction.heading"), "math-x-divide-y-2");

		new Setting(containerEl)
			.setName(t("auto-fraction.enabled.name"))
			.setDesc(this.renderHtml(t("auto-fraction.enabled.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autofractionEnabled)
				.onChange(async (value) => {
					this.plugin.settings.autofractionEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("auto-fraction.fraction-symbol.name"))
			.setDesc(this.renderHtml(t("auto-fraction.fraction-symbol.desc")))
			.addText(text => {
				text
					.setPlaceholder(DEFAULT_SETTINGS.autofractionSymbol)
					.setValue(this.plugin.settings.autofractionSymbol)
					.onChange(async (value) => {
						this.plugin.settings.autofractionSymbol = value;

						await this.plugin.saveSettings();
					});

				const datalist = containerEl.createEl("datalist", { attr: { id: "autofraction-symbol-list" } });
				["\\frac", "\\dfrac", "\\tfrac"].forEach(s => datalist.createEl("option", { value: s }));
				text.inputEl.setAttribute("list", "autofraction-symbol-list");
			});


		new Setting(containerEl)
			.setName(t("auto-fraction.excluded-environments.name"))
			.setDesc(this.renderHtml(t("auto-fraction.excluded-environments.desc")))
			.addTextArea(text => text
				.setPlaceholder("[ [\"^{\", \"}] ]")
				.setValue(this.plugin.settings.autofractionExcludedEnvs)
				.onChange(async (value) => {
					this.plugin.settings.autofractionExcludedEnvs = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName(t("auto-fraction.breaking-characters.name"))
			.setDesc(this.renderHtml(t("auto-fraction.breaking-characters.desc")))
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.autofractionBreakingChars)
				.setValue(this.plugin.settings.autofractionBreakingChars)
				.onChange(async (value) => {
					this.plugin.settings.autofractionBreakingChars = value;

					await this.plugin.saveSettings();
				}));
	}

	private displayMatrixShortcutsSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("matrix-shortcuts.heading"), "brackets-contain");

		new Setting(containerEl)
			.setName(t("matrix-shortcuts.enabled.name"))
			.setDesc(this.renderHtml(t("matrix-shortcuts.enabled.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.matrixShortcutsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.matrixShortcutsEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("matrix-shortcuts.environments.name"))
			.setDesc(this.renderHtml(t("matrix-shortcuts.environments.desc")))
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.matrixShortcutsEnvNames)
				.setValue(this.plugin.settings.matrixShortcutsEnvNames)
				.onChange(async (value) => {
					this.plugin.settings.matrixShortcutsEnvNames = value;

					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("matrix-shortcuts.macros.name"))
			.setDesc(this.renderHtml(t("matrix-shortcuts.macros.desc")))
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.matrixShortcutsMacroNames)
				.setValue(this.plugin.settings.matrixShortcutsMacroNames)
				.onChange(async (value) => {
					this.plugin.settings.matrixShortcutsMacroNames = value;

					await this.plugin.saveSettings();
				}));

	}

	private displayTaboutSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("tabout.heading"), "tabout");

		new Setting(containerEl)
			.setName(t("tabout.enabled.name"))
			.setDesc(this.renderHtml(t("tabout.enabled.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.taboutEnabled)
				.onChange(async (value) => {
					this.plugin.settings.taboutEnabled = value;

					taboutClosingBracketsSetting.settingEl.toggleClass("hidden", !value);
					taboutExitEquationOnlyOnEOLSetting.settingEl.toggleClass("hidden", !value);

					await this.plugin.saveSettings();
				}));

		const taboutClosingBracketsSetting =  new Setting(containerEl)
			.setName(t("tabout.closing-brackets.name"))
			.setDesc(this.renderHtml(t("tabout.closing-brackets.desc")))
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.taboutClosingSymbols)
				.setValue(this.plugin.settings.taboutClosingSymbols)
				.onChange(async (value) => {
					this.plugin.settings.taboutClosingSymbols = value;

					await this.plugin.saveSettings();
				}));

		const taboutExitEquationOnlyOnEOLSetting = new Setting(containerEl)
			.setName(t("tabout.exit-EOL.name"))
			.setDesc(this.renderHtml(t("tabout.exit-EOL.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.taboutExitEquationOnlyOnEOL)
				.onChange(async (value) => {
					this.plugin.settings.taboutExitEquationOnlyOnEOL = value;
					await this.plugin.saveSettings();
				}));

		taboutClosingBracketsSetting.settingEl.toggleClass("hidden", !this.plugin.settings.taboutEnabled);
		taboutExitEquationOnlyOnEOLSetting.settingEl.toggleClass("hidden", !this.plugin.settings.taboutEnabled);
	}

	private displayAutoEnlargeBracketsSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("auto-enlarge.heading"), "parentheses");

		new Setting(containerEl)
			.setName(t("auto-enlarge.enabled.name"))
			.setDesc(this.renderHtml(t("auto-enlarge.enabled.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoEnlargeBrackets)
				.onChange(async (value) => {
					this.plugin.settings.autoEnlargeBrackets = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName(t("auto-enlarge.triggers.name"))
			.setDesc(this.renderHtml(t("auto-enlarge.triggers.desc")))
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.autoEnlargeBracketsTriggers)
				.setValue(this.plugin.settings.autoEnlargeBracketsTriggers)
				.onChange(async (value) => {
					this.plugin.settings.autoEnlargeBracketsTriggers = value;

					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("auto-enlarge.space.name"))
			.setDesc(this.renderHtml(t("auto-enlarge.space.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoEnlargeBracketsSpace)
				.onChange(async (value) => {
					this.plugin.settings.autoEnlargeBracketsSpace = value;
					await this.plugin.saveSettings();
				}))
	}

	private displayAdvancedSnippetSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("advanced-snippets.heading"));

		const snippetVariablesSetting = new Setting(containerEl)
			.setName(t("advanced-snippets.variables.name"))
			.setDesc(this.renderHtml(t("advanced-snippets.variables.desc")))
		this.snippetVariablesEditor = createSnippetsEditor(snippetVariablesSetting, this.plugin, {
			type: "snippetVariables",
			validate: async (value) => {
				await parseSnippetVariables(value, "snippetVariables.js");
			}
		})

		new Setting(containerEl)
			.setName(t("advanced-snippets.load-variables-from-file.name"))
			.setDesc(this.renderHtml(t("advanced-snippets.load-variables-from-file.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.loadSnippetVariablesFromFile)
				.onChange(async (value) => {
					this.plugin.settings.loadSnippetVariablesFromFile = value;

					snippetVariablesSetting.settingEl.toggleClass("hidden", value);
					if (this.snippetVariablesFileLocEl != undefined)
						this.snippetVariablesFileLocEl.toggleClass("hidden", !value);

					await this.plugin.saveSettings(true);
				}));

		const snippetVariablesFileLocDesc = new DocumentFragment();
		snippetVariablesFileLocDesc.createDiv({}, (div) => {
			div.appendText(t("advanced-snippets.variables-file-path.desc"));
		});

		const snippetVariablesFileLoc = new Setting(containerEl)
			.setName(t("advanced-snippets.variables-file-path.name"))
			.setDesc(snippetVariablesFileLocDesc);


		snippetVariablesFileLoc.addSearch(component => {
			component
				.setPlaceholder(DEFAULT_SETTINGS.snippetVariablesFileLocation)
				.setValue(this.plugin.settings.snippetVariablesFileLocation)
				.onChange(debounce(async (value) => {
					this.plugin.settings.snippetVariablesFileLocation = value;
					await this.plugin.saveSettings(true);
				}, 500, true));

			const inputVariablesEl = component.inputEl;
			inputVariablesEl.addClass("latex-suite-location-input-el");
			new FileSuggest(this.app, inputVariablesEl);
		}
		);

		this.snippetVariablesFileLocEl = snippetVariablesFileLoc.settingEl;


		// Hide settings that are not relevant when "loadSnippetsFromFile" is set to true/false
		const loadSnippetVariablesFromFile = this.plugin.settings.loadSnippetVariablesFromFile;
		snippetVariablesSetting.settingEl.toggleClass("hidden", loadSnippetVariablesFromFile);
		this.snippetVariablesFileLocEl.toggleClass("hidden", !loadSnippetVariablesFromFile);

		new Setting(containerEl)
			.setName(t("advanced-snippets.word-delimiters.name"))
			.setDesc(this.renderHtml(t("advanced-snippets.word-delimiters.desc")))
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.wordDelimiters)
				.setValue(this.plugin.settings.wordDelimiters)
				.onChange(async (value) => {
					this.plugin.settings.wordDelimiters = value;

					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("advanced-snippets.trailing-whitespace.name"))
			.setDesc(this.renderHtml(t("advanced-snippets.trailing-whitespace.desc")))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.removeSnippetWhitespace)
				.onChange(async (value) => {
					this.plugin.settings.removeSnippetWhitespace = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
		.setName(t("advanced-snippets.auto-delete$.name"))
		.setDesc(this.renderHtml(t("advanced-snippets.auto-delete$.desc")))
		.addToggle((toggle) => toggle
			.setValue(this.plugin.settings.autoDelete$)
			.onChange(async (value) => {
				this.plugin.settings.autoDelete$ = value;
				await this.plugin.saveSettings();
			}));

		const suppressIMESetting = new Setting(containerEl)
			.setName(t("advanced-snippets.suppress-IME.name"))
			.setDesc(this.renderHtml(t("advanced-snippets.suppress-IME.desc")));
		const suppressIMEWarning = new Setting(containerEl)
			.setName(t("advanced-snippets.suppress-IME-warning.name"))
			.setDesc(this.renderHtml(t("advanced-snippets.suppress-IME-warning.desc")))
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.suppressIMEWarning)
				.onChange(async (value) => {
					this.plugin.settings.suppressIMEWarning = value;
					await this.plugin.saveSettings();
				})
			);
		suppressIMEWarning.settingEl.toggleClass("hidden", !(this.plugin.settings.suppressSnippetTriggerOnIME && isIMESupported()));
		suppressIMESetting
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.suppressSnippetTriggerOnIME)
				.onChange(async (value) => {
					this.plugin.settings.suppressSnippetTriggerOnIME = value;
					suppressIMEWarning.settingEl.toggleClass("hidden", !(value && isIMESupported()));
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("advanced-snippets.code-languages.name"))
			.setDesc(this.renderHtml(t("advanced-snippets.code-languages.desc")))
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.forceMathLanguages)
				.setValue(this.plugin.settings.forceMathLanguages)
				.onChange(async (value) => {
					this.plugin.settings.forceMathLanguages = value;

					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("advanced-snippets.snippet-debug-mode.name"))
			.setDesc(this.renderHtml(t("advanced-snippets.snippet-debug-mode.desc")))
			.addDropdown((dropdown) => dropdown
				.addOption("off", t("advanced-snippets.snippet-debug-mode.options.off"))
				.addOption("info", t("advanced-snippets.snippet-debug-mode.options.info"))
				.addOption("verbose", t("advanced-snippets.snippet-debug-mode.options.verbose"))
				.setValue(this.plugin.settings.snippetDebug)
				.onChange(async (value) => {
					this.plugin.settings.snippetDebug = value as "off" | "info" | "verbose";
					await this.plugin.saveSettings();
				})
			);
		const textMacrosSetting = new Setting(containerEl)
			.setName(t("advanced-snippets.text-macros.name"))
			.setDesc(this.renderHtml(t("advanced-snippets.text-macros.desc")))
		this.textMacrosEditor = createSnippetsEditor(textMacrosSetting, this.plugin, {
			type: "textMacros",
			validate: async (value) => {
				const result = validateTextMacros(value);
				if (!result.success) {
					const message = result.issues.map(issue => issue.message)
					console.error("Text macro validation failed:", message.join("\n"));
					return message;
				}
			}
		});
		//The toggle both hides the settings and makes the plugin not load the vim commands on startup.
		// the vim toggle is loaded before the rest since expanding down looks better.
		const vimEnabled: Setting = new Setting(containerEl)
			.setName(t("vim.enabled.name"))
			.setDesc(this.renderHtml(t("vim.enabled.desc")))
		const vimSettings: Setting[] = [];
		const selectMode: Setting = new Setting(containerEl)
			.setName(t("vim.select-mode.name"))
			.setDesc(this.renderHtml(t("vim.select-mode.desc")))
			.addText((text) =>
				text.setPlaceholder(DEFAULT_SETTINGS.vimSelectMode)
				.setValue(this.plugin.settings.vimSelectMode)
				.onChange(async (value) => {
					const oldValue: string = this.plugin.settings.vimSelectMode;
				this.plugin.settings.vimSelectMode = value;
				await this.plugin.saveSettings();
				const vimObject = window?.CodeMirrorAdapter?.Vim;
				if (!vimObject) return;
				const command: vimCommand = getVimSelectModeCommand(this.plugin.settings);
				vimObject[command.defineType](command.id, command.action);
				vimObject.mapCommand(command.key, command.type, command.id, {}, { context: command.context });
					// this unmaps the current keybinding and reverts to the previous keyMap. For example if oldValue = "<C-c>", then "<C-c>" goes back to "enter normal mode" in default settings.
				vimObject.unmap(oldValue, command.context);
				})
			);
		vimSettings.push(selectMode);
		const visualMode = new Setting(containerEl)
			.setName(t("vim.visual-mode.name"))
			.setDesc(this.renderHtml(t("vim.visual-mode.desc")))
			.addText((text) =>{
				text.setPlaceholder(DEFAULT_SETTINGS.vimVisualMode)
				.setValue(this.plugin.settings.vimVisualMode)
				.onChange(async (value) => {
					const oldvalue: string = this.plugin.settings.vimVisualMode;
					this.plugin.settings.vimVisualMode = value;
					await this.plugin.saveSettings();
					const command: vimCommand = getVimVisualModeCommand(this.plugin.settings);
					const vimObject = window?.CodeMirrorAdapter?.Vim;
					if (!vimObject) return;
					vimObject[command.defineType](command.id, command.action);
					vimObject.mapCommand(command.key, command.type, command.id, {}, { context: command.context });
					// this unmaps the current keybinding and reverts to the previous keyMap. For example if oldValue = "<C-c>", then "<C-c>" goes back to "enter normal mode" in default settings.
					vimObject.unmap(oldvalue, command.context);
				})
			});
		vimSettings.push(visualMode);
		const matrixEnter: Setting = new Setting(containerEl)
			.setName(t("vim.matrix-enter.name"))
			.setDesc(this.renderHtml(t("vim.matrix-enter.desc")))
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.vimMatrixEnter)
				.setValue(this.plugin.settings.vimMatrixEnter)
				.onChange(async (value) => {
					const oldValue: string = this.plugin.settings.vimMatrixEnter;
					this.plugin.settings.vimMatrixEnter = value;
					await this.plugin.saveSettings();
					const vimObj = window?.CodeMirrorAdapter?.Vim;
					if (!vimObj) return;
					vimObj.unmap(oldValue, "normal");
					const command: vimCommand = getVimRunMatrixEnterCommand(this.plugin.settings);
					vimObj[command.defineType](command.id, command.action);
					vimObj.mapCommand(command.key, command.type, command.id, {}, { context: command.context });
					vimObj.unmap(oldValue, command.context)
				})
			});
		vimSettings.push(matrixEnter);
		// shows/hides the vim settings, since these settings are not needed if vim is not enabled.
		vimEnabled.addToggle((toggle) => {
			const  vimOn = this.plugin.settings.vimEnabled && !!this.app.isVimEnabled?.();
			vimSettings.forEach(setting => setting.settingEl.toggleClass("hidden", !vimOn));
			toggle
				.setValue(this.plugin.settings.vimEnabled && !!this.app.isVimEnabled?.())
				.onChange(async (value) => {
					this.plugin.settings.vimEnabled = value;
					await this.plugin.saveSettings();
					vimSettings.forEach(setting => setting.settingEl.toggleClass("hidden", !value));
					const vimObject = window?.CodeMirrorAdapter?.Vim;
					if (!vimObject) return;
					for (const command of getVimEditorCommands(this.plugin.settings)) {
						vimObject.unmap(command.key, command.context);
				}
				});
		});
	}
	
	private displayKeymapSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("keymap.heading.name"), "keyboard");
		
		const settings = [
			["snippet", "snippetsTrigger"],
			["next-tabstop", "snippetNextTabstopTrigger"],
			["prev-tabstop", "snippetPreviousTabstopTrigger"],
			["auto-fraction", "autofractionTrigger"],
			["matrix-newline", "matrixShortcutsNewlineTrigger"],
			["matrix-cell", "matrixShortcutsCellTrigger"],
			["matrix-exit", "matrixShortcutsExitTrigger"],
			["tabout", "taboutTrigger"],
			["reverse-tabout", "reverseTaboutTrigger"],
		] as const;
		const explanation = new Setting(containerEl)
			.setDesc(this.renderHtml(t("keymap.desc")));
		explanation.setClass("latex-suite-keymap-list");
		explanation.settingEl.createEl("ul", {}, ol => {
			for (const [name, key] of settings) {
				ol.createEl("li", { cls: "latex-suite-keymap-item" }, li => {
					new Setting(li)
						.setName(t(`keymap.${name}`))
						.addText(text => text
							.setPlaceholder(DEFAULT_SETTINGS[key])
							.setValue(this.plugin.settings[key])
							.onChange(async (value) => {
								this.plugin.settings[key] = value;
								await this.plugin.saveSettings();
							})
						);
				});
			}
		})
	}

	private displayExperimentalSettings() {
		const containerEl = this.containerEl;
		this.addHeading(containerEl, t("experimental.heading.name"), "experiment")
			.setDesc(this.renderHtml(t("experimental.heading.desc")));
		new Setting(containerEl)
			.setName(t("experimental.snippet-recursion.name"))
			.setDesc(this.renderHtml(t("experimental.snippet-recursion.desc")))
			.addText(text => text
				.setPlaceholder(String(DEFAULT_SETTINGS.snippetRecursion))
				.setValue(String(this.plugin.settings.snippetRecursion))
				.onChange(async (value) => {
					try {
						const snippetRecurisve = parseInt(value, 10);
						if (snippetRecurisve < 0) {
							new Notice(t("experimental.snippet-recursion.invalid-notice"));
							return;
						}
						this.plugin.settings.snippetRecursion = snippetRecurisve;
					} catch {
						return
					}
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("experimental.snippet-IME-version.name"))
			.setDesc(this.renderHtml(t("experimental.snippet-IME-version.desc")))
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.snippetIMEVersion)
				.onChange(async (value) => {
					this.plugin.settings.snippetIMEVersion = value;
					await this.plugin.saveSettings();
				})
			);
			
		new Setting(containerEl)
			.setName(t("experimental.excalidraw-enabled.name"))
			.setDesc(this.renderHtml(t("experimental.excalidraw-enabled.desc")))
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.excalidrawSupportEnabled)
				.onChange(async (value) => {
					this.plugin.settings.excalidrawSupportEnabled = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName(t("experimental.log-level.name"))
			.setDesc(this.renderHtml(t("experimental.log-level.desc")))
			.addDropdown((dropdown) => dropdown
				.setValue(this.plugin.settings.logLevel)
				.addOption("off", t("experimental.log-level.options.off"))
				.addOption("info", t("experimental.log-level.options.info"))
				.addOption("verbose", t("experimental.log-level.options.verbose"))
				.addOption("vverbose", t("experimental.log-level.options.vverbose"))
				.onChange(async (value) => {
					this.plugin.settings.logLevel = value as LatexSuitePluginSettings["logLevel"];
					await this.plugin.saveSettings();
				})
			);
	}

	renderHtml(source: string) {
		return renderHtml(source);
	}
}

/**
 * IME support is tricky, currently only a fix for mobile platform is provided, update later if needed.
 * @returns Whether IME keyboards are supported
 */
export function isIMESupported(): boolean {
	return Platform.isMobileApp
}
