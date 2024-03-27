import { EditorState, Extension } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { App, ButtonComponent, ExtraButtonComponent, Modal, PluginSettingTab, Setting, setIcon } from "obsidian";
import { parseSnippetVariables, parseSnippets } from "src/snippets/parse";
import { DEFAULT_SNIPPETS } from "src/utils/default_snippets";
import LatexSuitePlugin from "../main";
import { DEFAULT_SETTINGS } from "./settings";
import { FileSuggest } from "./ui/file_suggest";
import { basicSetup } from "./ui/snippets_editor/extensions";


export class LatexSuiteSettingTab extends PluginSettingTab {
	plugin: LatexSuitePlugin;
	snippetsEditor: EditorView;
	snippetsFileLocEl: HTMLElement;
	snippetVariablesFileLocEl: HTMLElement;

	constructor(app: App, plugin: LatexSuitePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}


	hide() {
		this.snippetsEditor?.destroy();
	}

	addHeading(containerEl: HTMLElement, name: string, icon = "math") {
		const heading = new Setting(containerEl).setName(name).setHeading();

		const parentEl = heading.settingEl;
		const iconEl = parentEl.createDiv();
		setIcon(iconEl, icon);
		iconEl.addClass("latex-suite-settings-icon");

		parentEl.prepend(iconEl);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.addHeading(containerEl, "Snippets", "ballpen");

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether snippets are enabled.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.snippetsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.snippetsEnabled = value;
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
				.setValue(this.plugin.settings.loadSnippetsFromFile)
				.onChange(async (value) => {
					this.plugin.settings.loadSnippetsFromFile = value;

					snippetsSetting.settingEl.toggleClass("hidden", value);
					if (this.snippetsFileLocEl != undefined)
						this.snippetsFileLocEl.toggleClass("hidden", !value);

					await this.plugin.saveSettings();
				}));


		const snippetsFileLocDesc = new DocumentFragment();
		snippetsFileLocDesc.createDiv({}, div => {
			div.innerHTML = `
			The file or folder to load snippets from. The file or folder must be within your vault, and not within a hidden folder (such as <code>.obsidian/</code>).`
		});

		const snippetsFileLoc = new Setting(containerEl)
			.setName("Snippets file or folder location")
			.setDesc(snippetsFileLocDesc);


		let inputEl;
		snippetsFileLoc.addText(text => {
			text
				.setPlaceholder(DEFAULT_SETTINGS.snippetsFileLocation)
				.setValue(this.plugin.settings.snippetsFileLocation)
				.onChange(async (value) => {
					this.plugin.settings.snippetsFileLocation = value;

					await this.plugin.saveSettings();
				});

			inputEl = text.inputEl;
		}
		);

		this.snippetsFileLocEl = snippetsFileLoc.settingEl;
		new FileSuggest(this.app, inputEl);


		// Hide settings that are not relevant when "loadSnippetsFromFile" is set to true/false
		const loadSnippetsFromFile = this.plugin.settings.loadSnippetsFromFile;
		snippetsSetting.settingEl.toggleClass("hidden", loadSnippetsFromFile);
		this.snippetsFileLocEl.toggleClass("hidden", !loadSnippetsFromFile);


		new Setting(containerEl)
			.setName("Key trigger for non-auto snippets")
			.setDesc("What key to press to expand non-auto snippets.")
			.addDropdown((dropdown) => dropdown
				.addOption("Tab", "Tab")
				.addOption(" ", "Space")
				.setValue(this.plugin.settings.snippetsTrigger)
				.onChange(async (value) => {
					this.plugin.settings.snippetsTrigger = value as "Tab" |
						" ";
					await this.plugin.saveSettings();
				})
			);


		this.addHeading(containerEl, "Conceal", "math-integral-x");

		{
			const fragment = new DocumentFragment();
			fragment.createDiv({}, div => div.setText("Make equations more readable by hiding LaTeX markup and instead displaying it in a pretty format."));
			fragment.createDiv({}, div => div.innerHTML = `
				e.g. <code>\\dot{x}^{2} + \\dot{y}^{2}</code> will display as ẋ² + ẏ², and <code>\\sqrt{ 1-\\beta^{2} }</code> will display as √{ 1-β² }.
			`);
			fragment.createDiv({}, div => div.setText("LaTeX beneath the cursor will be revealed."));
			fragment.createEl("br");
			fragment.createDiv({}, div => div.setText("Disabled by default to not confuse new users. However, I recommend turning this on once you are comfortable with the plugin!"));

			new Setting(containerEl)
				.setName("Enabled")
				.setDesc(fragment)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.concealEnabled)
					.onChange(async (value) => {
						this.plugin.settings.concealEnabled = value;
						await this.plugin.saveSettings();
					})
				);
		}


		this.addHeading(containerEl, "Highlight and color brackets", "parentheses");

		new Setting(containerEl)
			.setName("Color paired brackets")
			.setDesc("Whether to colorize matching brackets.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.colorPairedBracketsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.colorPairedBracketsEnabled = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Highlight matching bracket beneath cursor")
			.setDesc("When the cursor is adjacent to a bracket, highlight the matching bracket.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.highlightCursorBracketsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.highlightCursorBracketsEnabled = value;
					await this.plugin.saveSettings();
				}));


		this.addHeading(containerEl, "Math popup preview", "superscript");

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
				.setValue(this.plugin.settings.mathPreviewEnabled)
				.onChange(async (value) => {
					this.plugin.settings.mathPreviewEnabled = value;

					await this.plugin.saveSettings();
				}));

		const mathPreviewPositionSetting = new Setting(containerEl)
      .setName("Position")
      .setDesc("Where to display the popup preview relative to the equation source.")
      .addDropdown((dropdown) => dropdown
		.addOption("Above", "Above")
        .addOption("Below", "Below")
        .setValue(this.plugin.settings.mathPreviewPositionIsAbove ? "Above" : "Below")
        .onChange(async (value) => {
          this.plugin.settings.mathPreviewPositionIsAbove = (value === "Above");
          await this.plugin.saveSettings();
        })
      );

		this.addHeading(containerEl, "Auto-fraction", "math-x-divide-y-2");

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether auto-fraction is enabled.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autofractionEnabled)
				.onChange(async (value) => {
					this.plugin.settings.autofractionEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Fraction symbol")
			.setDesc("The fraction symbol to use in the replacement. e.g. \\frac, \\dfrac, \\tfrac")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.autofractionSymbol)
				.setValue(this.plugin.settings.autofractionSymbol)
				.onChange(async (value) => {
					this.plugin.settings.autofractionSymbol = value;

					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Excluded environments")
			.setDesc("A list of environments to exclude auto-fraction from running in. For example, to exclude auto-fraction from running while inside an exponent, such as e^{...}, use  [\"^{\", \"}\"]")
			.addTextArea(text => text
				.setPlaceholder("[ [\"^{\", \"}] ]")
				.setValue(this.plugin.settings.autofractionExcludedEnvs)
				.onChange(async (value) => {
					this.plugin.settings.autofractionExcludedEnvs = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Breaking characters")
			.setDesc("A list of characters that denote the start/end of a fraction. e.g. if + is included in the list, \"a+b/c\" will expand to \"a+\\frac{b}{c}\". If + is not in the list, it will expand to \"\\frac{a+b}{c}\".")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.autofractionBreakingChars)
				.setValue(this.plugin.settings.autofractionBreakingChars)
				.onChange(async (value) => {
					this.plugin.settings.autofractionBreakingChars = value;

					await this.plugin.saveSettings();
				}));


		this.addHeading(containerEl, "Matrix shortcuts", "brackets-contain");

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether matrix shortcuts are enabled.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.matrixShortcutsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.matrixShortcutsEnabled = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Environments")
			.setDesc("A list of environment names to run the matrix shortcuts in, separated by commas.")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.matrixShortcutsEnvNames)
				.setValue(this.plugin.settings.matrixShortcutsEnvNames)
				.onChange(async (value) => {
					this.plugin.settings.matrixShortcutsEnvNames = value;

					await this.plugin.saveSettings();
				}));


		this.addHeading(containerEl, "Tabout", "tabout");

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether tabout is enabled.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.taboutEnabled)
				.onChange(async (value) => {
					this.plugin.settings.taboutEnabled = value;
					await this.plugin.saveSettings();
				}));


		this.addHeading(containerEl, "Auto-enlarge brackets", "parentheses");

		new Setting(containerEl)
			.setName("Enabled")
			.setDesc("Whether to automatically enlarge brackets containing e.g. sum, int, frac.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoEnlargeBrackets)
				.onChange(async (value) => {
					this.plugin.settings.autoEnlargeBrackets = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName("Triggers")
			.setDesc("A list of symbols that should trigger auto-enlarge brackets, separated by commas.")
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.autoEnlargeBracketsTriggers)
				.setValue(this.plugin.settings.autoEnlargeBracketsTriggers)
				.onChange(async (value) => {
					this.plugin.settings.autoEnlargeBracketsTriggers = value;

					await this.plugin.saveSettings();
				}));


		this.addHeading(containerEl, "Advanced snippet settings");

		const snippetVariablesSetting = new Setting(containerEl)
			.setName("Snippet variables")
			.setDesc("Assign snippet variables that can be used as shortcuts when writing snippets.")
			.addTextArea(text => text
				.setValue(this.plugin.settings.snippetVariables)
				.onChange(async (value) => {
					this.plugin.settings.snippetVariables = value;
					await this.plugin.saveSettings();
				})
				.setPlaceholder(DEFAULT_SETTINGS.snippetVariables))
			.setClass("latex-suite-snippet-variables-setting");

		new Setting(containerEl)
			.setName("Load snippet variables from file or folder")
			.setDesc("Whether to load snippet variables from a specified file, or from all files within a folder (instead of from the plugin settings).")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.loadSnippetVariablesFromFile)
				.onChange(async (value) => {
					this.plugin.settings.loadSnippetVariablesFromFile = value;

					snippetVariablesSetting.settingEl.toggleClass("hidden", value);
					if (this.snippetVariablesFileLocEl != undefined)
						this.snippetVariablesFileLocEl.toggleClass("hidden", !value);

					await this.plugin.saveSettings();
				}));
		
		const snippetVariablesFileLocDesc = new DocumentFragment();
		snippetVariablesFileLocDesc.createDiv({}, (div) => {
			div.innerHTML = `
			The file or folder to load snippet variables from. The file or folder must be within your vault, and not within a hidden folder (such as <code>.obsidian/</code>).`;
		});

		const snippetVariablesFileLoc = new Setting(containerEl)
			.setName("Snippet variables file or folder location")
			.setDesc(snippetVariablesFileLocDesc);


		let inputVariablesEl;
		snippetVariablesFileLoc.addText(text => {
			text
				.setPlaceholder(DEFAULT_SETTINGS.snippetVariablesFileLocation)
				.setValue(this.plugin.settings.snippetVariablesFileLocation)
				.onChange(async (value) => {
					this.plugin.settings.snippetVariablesFileLocation = value;

					await this.plugin.saveSettings();
				});

				inputVariablesEl = text.inputEl;
		}
		);

		this.snippetVariablesFileLocEl = snippetVariablesFileLoc.settingEl;
		new FileSuggest(this.app, inputVariablesEl);


		// Hide settings that are not relevant when "loadSnippetsFromFile" is set to true/false
		const loadSnippetVariablesFromFile = this.plugin.settings.loadSnippetVariablesFromFile;
		snippetVariablesSetting.settingEl.toggleClass("hidden", loadSnippetVariablesFromFile);
		this.snippetVariablesFileLocEl.toggleClass("hidden", !loadSnippetVariablesFromFile);

		new Setting(containerEl)
		.setName("Word delimiters")
		.setDesc("Symbols that will be treated as word delimiters, for use with the \"w\" snippet option.")
		.addText(text => text
			.setPlaceholder(DEFAULT_SETTINGS.wordDelimiters)
			.setValue(this.plugin.settings.wordDelimiters)
			.onChange(async (value) => {
				this.plugin.settings.wordDelimiters = value;

				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName("Remove trailing whitespaces in snippets in inline math")
		.setDesc("Whether to remove trailing whitespaces when expanding snippets at the end of inline math blocks.")
		.addToggle(toggle => toggle
			.setValue(this.plugin.settings.removeSnippetWhitespace)
			.onChange(async (value) => {
				this.plugin.settings.removeSnippetWhitespace = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName("Code languages to interpret as math mode")
		.setDesc("Codeblock languages where the whole code block should be treated like a math block, separated by commas.")
		.addText(text => text
			.setPlaceholder(DEFAULT_SETTINGS.forceMathLanguages)
			.setValue(this.plugin.settings.forceMathLanguages)
			.onChange(async (value) => {
				this.plugin.settings.forceMathLanguages = value;

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
				const snippets = v.state.doc.toString();
				let success = true;

				let snippetVariables;
				try {
					snippetVariables = await parseSnippetVariables(this.plugin.settings.snippetVariables)
					await parseSnippets(snippets, snippetVariables);
				}
				catch (e) {
					success = false;
				}

				updateValidityIndicator(success);

				if (!success) return;

				this.plugin.settings.snippets = snippets;
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
