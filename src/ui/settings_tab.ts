import { App, PluginSettingTab, Setting, Modal, ButtonComponent, ExtraButtonComponent } from "obsidian";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
import { basicSetup } from "./snippets_editor/extensions";
import { DEFAULT_SNIPPETS } from "../default_snippets";
import LatexSuitePlugin from "../main";
import { FileSuggest } from "./file_suggest";
import { debouncedSetSnippetsFromFileOrFolder } from "../snippets/file_watch";
import { DEFAULT_SETTINGS } from "../settings";
import { parseSnippets } from "src/snippets/parse_snippets";


export class LatexSuiteSettingTab extends PluginSettingTab {
	plugin: LatexSuitePlugin;
	snippetsEditor: EditorView;
	snippetsFileLocEl: HTMLElement;

	constructor(app: App, plugin: LatexSuitePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}


	hide() {
		this.snippetsEditor?.destroy();
	}


	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("div", { text: "Snippets" }).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);


		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether snippets are enabled.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.snippetsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.snippetsEnabled = value;
					await this.plugin.saveSettings();
				}));


		const snippetsSetting = new Setting(containerEl)
			.setName("Snippets")
			.setDesc("Enter snippets here.  Remember to add a comma after each snippet, and escape all backslashes with an extra \\. Lines starting with \"//\" will be treated as comments and ignored.")
			.setClass("snippets-text-area");


		this.createSnippetsEditor(snippetsSetting);


		new Setting(containerEl)
			.setName("Load snippets from file or folder")
			.setDesc("Whether to load snippets from a specified file, or from all files within a folder (instead of from the plugin settings).")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.loadSnippetsFromFile)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.loadSnippetsFromFile = value;

					snippetsSetting.settingEl.toggleClass("hidden", value);
					if (this.snippetsFileLocEl != undefined)
						this.snippetsFileLocEl.toggleClass("hidden", !value);

					// TODO
					// if (value) {
					// 	debouncedSetSnippetsFromFileOrFolder(this.plugin);
					// }
					// else {
					// 	this.plugin.setSnippets(this.plugin.settings.snippets);
					// }

					await this.plugin.saveSettings();
				}));


		const snippetsFileLoc = new Setting(containerEl)
			.setName("Snippets file or folder location")
			.setDesc("The file or folder to load snippets from.");


		let inputEl;
		snippetsFileLoc.addText(text => {
			text
				.setPlaceholder(DEFAULT_SETTINGS.basicSettings.snippetsFileLocation)
				.setValue(this.plugin.settings.basicSettings.snippetsFileLocation)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.snippetsFileLocation = value;

					debouncedSetSnippetsFromFileOrFolder(this.plugin);

					await this.plugin.saveSettings();
				});

			inputEl = text.inputEl;
		}
		);

		this.snippetsFileLocEl = snippetsFileLoc.settingEl;
		new FileSuggest(this.app, inputEl);


		// Hide settings that are not relevant when "loadSnippetsFromFile" is set to true/false
		const loadSnippetsFromFile = this.plugin.settings.basicSettings.loadSnippetsFromFile;
		snippetsSetting.settingEl.toggleClass("hidden", loadSnippetsFromFile);
		this.snippetsFileLocEl.toggleClass("hidden", !loadSnippetsFromFile);


		new Setting(containerEl)
			.setName("Key trigger for non-auto snippets")
			.setDesc("What key to press to expand non-auto snippets.")
			.addDropdown((dropdown) => dropdown
				.addOption("Tab", "Tab")
				.addOption(" ", "Space")
				.setValue(this.plugin.settings.basicSettings.snippetsTrigger)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.snippetsTrigger = value as "Tab" |
						" ";
					await this.plugin.saveSettings();
				})
			);


		new Setting(containerEl)
			.setName("Code languages ignoring math mode")
			.setDesc("Codeblock languages where $ in code should not be interpreted as math mode delimiters, separated by commas.")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.rawSettings.ignoreMathLanguages)
				.setValue(this.plugin.settings.rawSettings.ignoreMathLanguages)
				.onChange(async (value) => {
					this.plugin.settings.rawSettings.ignoreMathLanguages = value;

					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Code languages to interpret as math mode")
			.setDesc("Codeblock languages where the whole code block should be treated like a math block, separated by commas.")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.rawSettings.forceMathLanguages)
				.setValue(this.plugin.settings.rawSettings.forceMathLanguages)
				.onChange(async (value) => {
					this.plugin.settings.rawSettings.forceMathLanguages = value;

					await this.plugin.saveSettings();
				}));


		containerEl.createEl("div", { text: "Conceal" }).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

		{
			const fragment = document.createDocumentFragment();
			const line1 = document.createElement("div");
			line1.setText("Make equations more readable by hiding LaTeX markup and instead displaying it in a pretty format.");
			const line2 = document.createElement("div");
			line2.setText("e.g. \\dot{x}^{2} + \\dot{y}^{2} will display as ẋ² + ẏ², and \\sqrt{ 1-\\beta^{2} } will display as √{ 1-β² }.");
			const line3 = document.createElement("div");
			line3.setText("LaTeX beneath the cursor will be revealed.");
			const space = document.createElement("br");
			const line4 = document.createElement("div");
			line4.setText("Disabled by default to not confuse new users. However, I recommend turning this on once you are comfortable with the plugin!");

			fragment.append(line1, line2, line3, space, line4);


			new Setting(containerEl)
				.setName("Enabled")
				.setDesc(fragment)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.basicSettings.concealEnabled)
					.onChange(async (value) => {
						this.plugin.settings.basicSettings.concealEnabled = value;
						this.plugin.refreshCMExtensions();
						await this.plugin.saveSettings();
					}));
		}


		containerEl.createEl("div", { text: "Highlight and color brackets" }).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

		new Setting(containerEl)
			.setName("Color paired brackets")
			.setDesc("Whether to colorize matching brackets.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.colorPairedBracketsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.colorPairedBracketsEnabled = value;

					this.plugin.refreshCMExtensions();
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Highlight matching bracket beneath cursor")
			.setDesc("When the cursor is adjacent to a bracket, highlight the matching bracket.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.highlightCursorBracketsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.highlightCursorBracketsEnabled = value;
					this.plugin.refreshCMExtensions();
					await this.plugin.saveSettings();
				}));



		containerEl.createEl("div", { text: "Math popup preview" }).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

		const popup_fragment = document.createDocumentFragment();
		const popup_line1 = document.createElement("div");
		popup_line1.setText("When inside an equation, show a popup preview window of the rendered math.");
		const popup_space = document.createElement("br");
		const popup_line4 = document.createElement("div");
		popup_line4.setText("The popup preview will be shown for all inline math equations, as well as for block math equations in Source mode.");

		popup_fragment.append(popup_line1, popup_space, popup_line4);

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc(popup_fragment)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.mathPreviewEnabled)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.mathPreviewEnabled = value;
					this.plugin.refreshCMExtensions();
					await this.plugin.saveSettings();
				}));



		containerEl.createEl("div", { text: "Auto-fraction" }).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether auto-fraction is enabled.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.autofractionEnabled)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.autofractionEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Fraction symbol")
			.setDesc("The fraction symbol to use in the replacement. e.g. \\frac, \\dfrac, \\tfrac")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.basicSettings.autofractionSymbol)
				.setValue(this.plugin.settings.basicSettings.autofractionSymbol)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.autofractionSymbol = value;

					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Excluded environments")
			.setDesc("A list of environments to exclude auto-fraction from running in. For example, to exclude auto-fraction from running while inside an exponent, such as e^{...}, use  [\"^{\", \"}\"]")
			.addTextArea(text => text
				.setPlaceholder("[ [\"^{\", \"}] ]")
				.setValue(this.plugin.settings.rawSettings.autofractionExcludedEnvs)
				.onChange(async (value) => {
					this.plugin.settings.rawSettings.autofractionExcludedEnvs = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Breaking characters")
			.setDesc("A list of characters that denote the start/end of a fraction. e.g. if + is included in the list, \"a+b/c\" will expand to \"a+\\frac{b}{c}\". If + is not in the list, it will expand to \"\\frac{a+b}{c}\".")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.basicSettings.autofractionBreakingChars)
				.setValue(this.plugin.settings.basicSettings.autofractionBreakingChars)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.autofractionBreakingChars = value;

					await this.plugin.saveSettings();
				}));


		containerEl.createEl("div", { text: "Matrix shortcuts" }).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether matrix shortcuts are enabled.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.matrixShortcutsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.matrixShortcutsEnabled = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Environments")
			.setDesc("A list of environment names to run the matrix shortcuts in, separated by commas.")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.rawSettings.matrixShortcutsEnvNames)
				.setValue(this.plugin.settings.rawSettings.matrixShortcutsEnvNames)
				.onChange(async (value) => {
					this.plugin.settings.rawSettings.matrixShortcutsEnvNames = value;

					await this.plugin.saveSettings();
				}));


		containerEl.createEl("div", { text: "Tabout" }).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether tabout is enabled.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.taboutEnabled)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.taboutEnabled = value;
					await this.plugin.saveSettings();
				}));


		containerEl.createEl("div", { text: "Auto-enlarge brackets" }).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether to automatically enlarge brackets containing e.g. sum, int, frac.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.autoEnlargeBrackets)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.autoEnlargeBrackets = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Triggers")
			.setDesc("A list of symbols that should trigger auto-enlarge brackets, separated by commas.")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.rawSettings.autoEnlargeBracketsTriggers)
				.setValue(this.plugin.settings.rawSettings.autoEnlargeBracketsTriggers)
				.onChange(async (value) => {
					this.plugin.settings.rawSettings.autoEnlargeBracketsTriggers = value;

					await this.plugin.saveSettings();
				}));


		containerEl.createEl("div", { text: "Misc" }).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

		new Setting(containerEl)
			.setName("Word delimiters")
			.setDesc("Symbols that will be treated as word delimiters, for use with the \"w\" snippet option.")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.basicSettings.wordDelimiters)
				.setValue(this.plugin.settings.basicSettings.wordDelimiters)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.wordDelimiters = value;

					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Remove trailing whitespaces in snippets in inline math")
			.setDesc("Whether to remove trailing whitespaces when expanding snippets at the end of inline math blocks.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.basicSettings.removeSnippetWhitespace)
				.onChange(async (value) => {
					this.plugin.settings.basicSettings.removeSnippetWhitespace = value;
					await this.plugin.saveSettings();
				}));
	}


	createSnippetsEditor(snippetsSetting: Setting) {
		const customCSSWrapper = snippetsSetting.controlEl.createDiv("snippets-editor-wrapper");
		const snippetsFooter = snippetsSetting.controlEl.createDiv("snippets-footer");
		const validity = snippetsFooter.createDiv("snippets-editor-validity");

		const validityIndicator = new ExtraButtonComponent(validity);
		validityIndicator.setIcon("checkmark")
			.extraSettingsEl.addClass("snippets-editor-validity-indicator");

		const validityText = validity.createDiv("snippets-editor-validity-text");
		validityText.addClass("setting-item-description");
		validityText.style.padding = "0";


		function updateValidityIndicator(success: boolean) {
			validityIndicator.setIcon(success ? "checkmark" : "cross");
			validityIndicator.extraSettingsEl.removeClass(success ? "invalid" : "valid");
			validityIndicator.extraSettingsEl.addClass(success ? "valid" : "invalid");
			validityText.setText(success ? "Saved" : "Invalid syntax. Changes not saved");
		}


		const extensions = basicSetup;

		const change = EditorView.updateListener.of(async (v: ViewUpdate) => {
			if (v.docChanged) {
				const value = v.state.doc.toString();
				let success = true;

				try {
					parseSnippets(value);
				}
				catch (e) {
					success = false;
				}

				updateValidityIndicator(success);

				if (!success) return;


				this.plugin.settings.snippets = value;
				await this.plugin.saveSettings();
			}
		});

		extensions.push(change);

		this.snippetsEditor = createCMEditor(this.plugin.settings.snippets, extensions);
		customCSSWrapper.appendChild(this.snippetsEditor.dom);


		const buttonsDiv = snippetsFooter.createDiv("snippets-editor-buttons");
		const reset = new ButtonComponent(buttonsDiv);
		reset.setIcon("switch")
			.setTooltip("Reset to default snippets")
			.onClick(async () => {
				new ConfirmationModal(this.plugin.app,
					"Are you sure? This will delete any custom snippets you have written.",
					button => button
						.setButtonText("Reset to default snippets")
						.setWarning(),
					async () => {
						this.snippetsEditor.setState(EditorState.create({ doc: DEFAULT_SNIPPETS, extensions: extensions }));
						updateValidityIndicator(true);

						this.plugin.settings.snippets = DEFAULT_SNIPPETS;

						await this.plugin.saveSettings();
					}
				).open();
			});

		const remove = new ButtonComponent(buttonsDiv);
		remove.setIcon("trash")
			.setTooltip("Remove all snippets")
			.onClick(async () => {
				new ConfirmationModal(this.plugin.app,
					"Are you sure? This will delete any custom snippets you have written.",
					button => button
						.setButtonText("Remove all snippets")
						.setWarning(),
					async () => {
						const value = `[

]`;
						this.snippetsEditor.setState(EditorState.create({ doc: value, extensions: extensions }));
						updateValidityIndicator(true);

						this.plugin.settings.snippets = value;
						await this.plugin.saveSettings();
					}
				).open();
			});
	}
}
class ConfirmationModal extends Modal {

	constructor(app: App, body: string, buttonCallback: (button: ButtonComponent) => void, clickCallback: () => Promise<void>) {
		super(app);

		this.contentEl.addClass("latex-suite-confirmation-modal");
		this.contentEl.createEl("p", { text: body });


		new Setting(this.contentEl)
			.addButton(button => {
				buttonCallback(button);
				button.onClick(async () => {
					await clickCallback();
					this.close();
				});
			})
			.addButton(button => button
				.setButtonText("Cancel")
				.onClick(() => this.close()));
	}
}

function createCMEditor(content: string, extensions: Extension[]) {
	const view = new EditorView({
		state: EditorState.create({ doc: content, extensions }),
	});

	return view;
}
