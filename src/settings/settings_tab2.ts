import { App, ButtonComponent, Component, debounce, ExtraButtonComponent, MarkdownRenderer, Modal, Platform, Setting, SettingDefinition, SettingDefinitionControl, SettingDefinitionItem, SettingTab } from "obsidian"
import { DEFAULT_SETTINGS, LatexSuitePluginSettings } from "./settings"
import { i18next } from "../i18n/i18n"
import { EditorState, Extension } from "@codemirror/state"
import { EditorView, ViewUpdate } from "@codemirror/view"
import { parseSnippetVariables, parseSnippets } from "src/snippets/parse"
import { DEFAULT_SNIPPETS } from "src/utils/default_snippets"
import { basicSetup } from "./ui/snippets_editor/extensions"
import LatexSuitePlugin from "src/main"
import { FileSuggest } from "./ui/file_suggest"


type Definition<K> = K extends keyof LatexSuitePluginSettings ? SettingDefinition<K> : never
type SnippetSettingDefinition = Definition<
	| "snippetsEnabled"
	| "snippets"
	| "loadSnippetsFromFile"
	| "snippetsFileLocation"
>;

type AdvancedSnippetSettingDefinition = Definition<
	| "snippetVariables"
	| "loadSnippetVariablesFromFile"
	| "snippetVariablesFileLocation"
	| "wordDelimiters"
	| "removeSnippetWhitespace"
	| "autoDelete$"
	| "suppressIMEWarning"
	| "suppressSnippetTriggerOnIME"
	| "forceMathLanguages"
	| "snippetDebug"
>

type ConcealSettingDefinition = Definition<
	| "concealEnabled"
	| "concealRevealTimeout"
>

type ColorHighlightSettingDefinition = Definition<
	| "colorPairedBracketsEnabled"
	| "highlightCursorBracketsEnabled"
	| "highlightDollarEnabled"
>

type PopupPreviewSettingDefinition = Definition<
	| "mathPreviewEnabled"
	| "mathPreviewPositionIsAbove"
	| "mathPreviewCursor"
	| "mathPreviewBracketHighlighting"
	| "mathPreviewLivePreviewDisplay"
>

type AutofractionSettingDefinition = Definition<
	| "autofractionEnabled"
	| "autofractionSymbol"
	| "autofractionBreakingChars"
	| "autofractionExcludedEnvs"
>

type MatrixShortcutsSettingDefinition = Definition<
	| "matrixShortcutsEnabled"
	| "matrixShortcutsEnvNames"
	| "matrixShortcutsMacroNames"
>

type TaboutSettingDefinition = Definition<
	| "taboutEnabled"
	| "taboutClosingSymbols"
	| "taboutExitEquationOnlyOnEOL"
>

type AutoEnlargeBracketsSettingDefinition = Definition<
	| "autoEnlargeBrackets"
	| "autoEnlargeBracketsTriggers"
	| "autoEnlargeBracketsSpace"
>

type VimSettingDefinition = Definition<
	| "vimEnabled"
	| "vimSelectMode"
	| "vimVisualMode"
	| "vimMatrixEnter"
>

type ExperimentalSettingDefinition = Definition<
	| "snippetRecursion"
>


export class LatexSuiteSettingsTab2 extends SettingTab {
	snippetsEditor: EditorView | null = null;

	constructor(
		public app: App,
		public plugin: LatexSuitePlugin,
	) {
		super();
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			...this.getSnippetDefinitions(),
			...this.getConcealDefinitions(),
			...this.getColorHighlightBracketsDefinitions(),
			...this.getPopupPreviewDefinitions(),
			...this.getAutofractionDefinitions(),
			...this.getMatrixShortcutsDefinitions(),
			...this.getTaboutDefinitions(),
			...this.getAutoEnlargeBracketsDefinitions(),
			...this.getVimSettingDefinitions(),
			...this.getKeyMapDefinitions(),
			...this.getExperimentalDefinitions(),
		]
	}

	getSnippetDefinitions(): SettingDefinitionItem[] {
		const snippets: SnippetSettingDefinition[] = [];
		snippets.push(
			{
				name: i18next.t("snippets.enabled.name"),
				desc: i18next.t("snippets.enabled.desc"),
				control: {
					type: "toggle",
					key: "snippetsEnabled",
					defaultValue: DEFAULT_SETTINGS.snippetsEnabled,
				},
			},
			{
				name: i18next.t("snippets.snippets.name"),
				desc: i18next.t("snippets.snippets.desc"),
				render: (setting) => {
					setting.setClass("snippets-text-area");
					this.snippetsEditor?.destroy()
					this.snippetsEditor = createSnippetsEditor(setting, this.plugin);
				},
				visible: () => !this.plugin.settings.loadSnippetsFromFile,
			},
			{
				name: i18next.t("snippets.load-from-file.name"),
				desc: i18next.t("snippets.load-from-file.desc"),
				control: {
					key: "loadSnippetsFromFile",
					type: "toggle",
					defaultValue: DEFAULT_SETTINGS.loadSnippetsFromFile,
				},
			},
			{
				name: i18next.t("snippets.file-path.name"),
				desc: i18next.t("snippets.file-path.desc"),
				render: (setting) => {
					this.fileSearch(setting, "snippetsFileLocation")
				},
				visible: () => this.plugin.settings.loadSnippetsFromFile,
			},
		);
		const advanced: AdvancedSnippetSettingDefinition[] = [
			{
				name: i18next.t("advanced-snippets.variables.name"),
				desc: i18next.t("advanced-snippets.variables.desc"),
				render: (setting) => {
					setting.addTextArea(text => text
						.setValue(this.plugin.settings.snippetVariables)
						.onChange(async (value) => {
							this.plugin.settings.snippetVariables = value;
							await this.plugin.saveSettings();
						})
						.setPlaceholder(DEFAULT_SETTINGS.snippetVariables))
						.setClass("latex-suite-snippet-variables-setting");
				},
				visible: () => !this.plugin.settings.loadSnippetVariablesFromFile
			},
			{
				name: i18next.t("advanced-snippets.load-variables-from-file.name"),
				desc: i18next.t("advanced-snippets.load-variables-from-file.desc"),
				control: getToggleControl("loadSnippetVariablesFromFile"),
			},
			{
				name: i18next.t("advanced-snippets.variables-file-path.name"),
				desc: i18next.t("advanced-snippets.variables-file-path.desc"),
				render: (setting) => {
					this.fileSearch(setting, "snippetVariablesFileLocation")
				},
				visible: () => this.plugin.settings.loadSnippetVariablesFromFile
			},
			{
				name: i18next.t("advanced-snippets.word-delimiters.name"),
				desc: i18next.t("advanced-snippets.word-delimiters.desc"),
				control: {
					type: "text",
					key: "wordDelimiters",
					defaultValue: DEFAULT_SETTINGS.wordDelimiters,
				}
			},
			{
				name: i18next.t("advanced-snippets.trailing-whitespace.name"),
				desc: i18next.t("advanced-snippets.trailing-whitespace.desc"),
				control: {
					type: "toggle",
					key: "removeSnippetWhitespace",
					defaultValue: DEFAULT_SETTINGS.removeSnippetWhitespace,
				}
			},
			{
				name: i18next.t("advanced-snippets.auto-delete$.name"),
				desc: i18next.t("advanced-snippets.auto-delete$.desc"),
				control: {
					type: "toggle",
					key: "autoDelete$",
					defaultValue: DEFAULT_SETTINGS.autoDelete$,
				}
			},
			{
				name: i18next.t("advanced-snippets.suppress-IME-warning.name"),
				desc: i18next.t("advanced-snippets.suppress-IME-warning.desc"),
				control: getToggleControl("suppressIMEWarning"),
				visible: () => isIMESupported() && this.plugin.settings.suppressSnippetTriggerOnIME
			},
			{
				name: i18next.t("advanced-snippets.suppress-IME.name"),
				desc: i18next.t("advanced-snippets.suppress-IME.desc"),
				control: getToggleControl("suppressSnippetTriggerOnIME"),
			},
			{
				name: i18next.t("advanced-snippets.code-languages.name"),
				desc: i18next.t("advanced-snippets.code-languages.desc"),
				control: {
					type: "text",
					key: "forceMathLanguages",
					defaultValue: DEFAULT_SETTINGS.forceMathLanguages,
				}
			},
			{
				name: i18next.t("advanced-snippets.snippet-debug-mode.name"),
				desc: i18next.t("advanced-snippets.snippet-debug-mode.desc"),
				control: {
					type: "dropdown",
					key: "snippetDebug",
					options: {
						off: i18next.t("advanced-snippets.snippet-debug-mode.options.off"),
						info: i18next.t("advanced-snippets.snippet-debug-mode.options.info"),
						verbose: i18next.t("advanced-snippets.snippet-debug-mode.options.verbose")
					},
					defaultValue: DEFAULT_SETTINGS.snippetDebug
				}
			}
		]
		return [{
			type: "page",
			name: i18next.t("snippets.heading"),
			items: [...snippets, {
				type: "group",
				heading: i18next.t("advanced-snippets.heading"),
				items: advanced
			}],
		}]
	}

	getConcealDefinitions(): SettingDefinitionItem[] {
		const settings: ConcealSettingDefinition[] = [
			{
				name: i18next.t("conceal.enabled.name"),
				desc: renderMarkdown(this.app, i18next.t("conceal.enabled.desc")),
				control: {
					type: "toggle",
					key: "concealEnabled",
					defaultValue: DEFAULT_SETTINGS.concealEnabled
				}
			},
			{
				name: i18next.t("conceal.reveal-delay.name"),
				desc: renderMarkdown(this.app, i18next.t("conceal.reveal-delay.desc")),
				control: {
					type: "number",
					key: "concealRevealTimeout",
					defaultValue: DEFAULT_SETTINGS.concealRevealTimeout,
					min: 0,
				},
			},
		]
		return [{
			type: "page",
			name: i18next.t("conceal.heading"),
			items: settings,
		}]
	}

	getColorHighlightBracketsDefinitions(): SettingDefinitionItem[] {
		const settings: ColorHighlightSettingDefinition[] = [
			{
				name: i18next.t("highlight-brackets.color-brackets.name"),
				desc: i18next.t("highlight-brackets.color-brackets.desc"),
				control: {
					type: "toggle",
					key: "colorPairedBracketsEnabled",
					defaultValue: DEFAULT_SETTINGS.colorPairedBracketsEnabled,
				}
			},
			{
				name: i18next.t("highlight-brackets.highlight-brackets.name"),
				desc: i18next.t("highlight-brackets.highlight-brackets.desc"),
				control: {
					type: "toggle",
					key: "highlightCursorBracketsEnabled",
					defaultValue: DEFAULT_SETTINGS.highlightCursorBracketsEnabled,
				}
			},
			{
				name: i18next.t("highlight-brackets.color-math.name"),
				desc: i18next.t("highlight-brackets.color-math.desc"),
				control: {
					type: "toggle",
					key: "highlightDollarEnabled",
					defaultValue: DEFAULT_SETTINGS.highlightDollarEnabled,
				}
			}
		]
		return [{
			type: "page",
			name: i18next.t("highlight-brackets.heading"),
			items: settings
		}]
	}

	getPopupPreviewDefinitions(): SettingDefinitionItem[] {
		const settings: PopupPreviewSettingDefinition[] = [
			{
				name: i18next.t("math-preview.enabled.name"),
				desc: renderMarkdown(this.app, i18next.t("math-preview.enabled.desc")),
				control: {
					type: "toggle",
					key: "mathPreviewEnabled",
					defaultValue: DEFAULT_SETTINGS.mathPreviewEnabled,
				}
			},
			{
				name: i18next.t("math-preview.position.name"),
				desc: i18next.t("math-preview.position.desc"),
				render: (setting) => {
					setting.addDropdown((dropdown) => dropdown
						.addOption("above", i18next.t("math-preview.position.options.above"))
						.addOption("below", i18next.t("math-preview.position.options.below"))
						.setValue(this.plugin.settings.mathPreviewPositionIsAbove ? "above" : "below")
						.onChange(async (value) => {
							this.plugin.settings.mathPreviewPositionIsAbove = value === "above";
							await this.plugin.saveSettings();
						})
					)
				}
			},
			{
				name: i18next.t("math-preview.cursor-symbol.name"),
				desc: i18next.t("math-preview.cursor-symbol.desc"),
				render: (setting) => {
					setting.addText(text => {
						text
							.setPlaceholder(DEFAULT_SETTINGS.mathPreviewCursor)
							.setValue(this.plugin.settings.mathPreviewCursor)
							.onChange(async (value) => {
								this.plugin.settings.mathPreviewCursor = value;
								await this.plugin.saveSettings();
							});
						const datalist = setting.controlEl.createEl("datalist", { attr: { id: "math-preview-cursor-list" } });
						["▶", "┃", "|", "\\_", "{\\mid}", "{\\triangle}"].forEach(s => datalist.createEl("option", { value: s }));
						text.inputEl.setAttribute("list", "math-preview-cursor-list");
						return text;
					});
				}
			},
			{
				name: i18next.t("math-preview.highlight-brackets.name"),
				desc: i18next.t("math-preview.highlight-brackets.desc"),
				control: {
					type: "toggle",
					key: "mathPreviewBracketHighlighting",
					defaultValue: DEFAULT_SETTINGS.mathPreviewBracketHighlighting,
				}
			},
			{
				name: i18next.t("math-preview.display-live-preview.name"),
				desc: i18next.t("math-preview.display-live-preview.desc"),
				control: {
					type: "toggle",
					key: "mathPreviewLivePreviewDisplay",
					defaultValue: DEFAULT_SETTINGS.mathPreviewLivePreviewDisplay,
				}
			}
		]
		return [{
			type: "page",
			name: i18next.t("math-preview.heading"),
			items: settings,
		}]
	}

	getAutofractionDefinitions(): SettingDefinitionItem[] {
		const settings: AutofractionSettingDefinition[] = [
			{
				name: i18next.t("auto-fraction.enabled.name"),
				desc: i18next.t("auto-fraction.enabled.desc"),
				control: {
					type: "toggle",
					key: "autofractionEnabled",
					defaultValue: DEFAULT_SETTINGS.autofractionEnabled,
				}
			},
			{
				name: i18next.t("auto-fraction.fraction-symbol.name"),
				desc: renderMarkdown(this.app, i18next.t("auto-fraction.fraction-symbol.desc")),
				render: (setting) => {
					setting.addText(text => {
						text
							.setPlaceholder(DEFAULT_SETTINGS.autofractionSymbol)
							.setValue(this.plugin.settings.autofractionSymbol)
							.onChange(async (value) => {
								this.plugin.settings.autofractionSymbol = value;

								await this.plugin.saveSettings();
							});

						const datalist = setting.controlEl.createEl("datalist", { attr: { id: "autofraction-symbol-list" } });
						["\\frac", "\\dfrac", "\\tfrac"].forEach(s => datalist.createEl("option", { value: s }));
						text.inputEl.setAttribute("list", "autofraction-symbol-list");
					});
				}
			},
			{
				name: i18next.t("auto-fraction.excluded-environments.name"),
				desc: i18next.t("auto-fraction.excluded-environments.desc"),
				control: {
					key: "autofractionExcludedEnvs",
					type: "textarea",
					defaultValue: DEFAULT_SETTINGS.autofractionExcludedEnvs
				}
			},
			{
				name: i18next.t("auto-fraction.breaking-characters.name"),
				desc: i18next.t("auto-fraction.breaking-characters.desc"),
				control: {
					key: "autofractionBreakingChars",
					type: "text",
					defaultValue: DEFAULT_SETTINGS.autofractionBreakingChars
				}
			}
		]

		return [{
			type: "page",
			name: i18next.t("auto-fraction.heading"),
			items: settings,
		}]
	}

	getMatrixShortcutsDefinitions(): SettingDefinitionItem[] {
		const settings: MatrixShortcutsSettingDefinition[] = [
			{
				name: i18next.t("matrix-shortcuts.enabled.name"),
				desc: i18next.t("matrix-shortcuts.enabled.desc"),
				control: {
					type: "toggle",
					key: "matrixShortcutsEnabled",
					defaultValue: DEFAULT_SETTINGS.matrixShortcutsEnabled,
				}
			},
			{
				name: i18next.t("matrix-shortcuts.environments.name"),
				desc: i18next.t("matrix-shortcuts.environments.desc"),
				control: {
					key: "matrixShortcutsEnvNames",
					type: "text",
					defaultValue: DEFAULT_SETTINGS.matrixShortcutsEnvNames
				}
			},
			{
				name: i18next.t("matrix-shortcuts.macros.name"),
				desc: i18next.t("matrix-shortcuts.macros.desc"),
				control: {
					key: "matrixShortcutsMacroNames",
					type: "text",
					defaultValue: DEFAULT_SETTINGS.matrixShortcutsMacroNames
				}
			}
		]
		return [{
			type: "page",
			name: i18next.t("matrix-shortcuts.heading"),
			items: settings,
		}]
	}

	getTaboutDefinitions(): SettingDefinitionItem[] {
		const settings: TaboutSettingDefinition[] = [
			{
				name: i18next.t("tabout.enabled.name"),
				desc: i18next.t("tabout.enabled.desc"),
				control: {
					type: "toggle",
					key: "taboutEnabled",
					defaultValue: DEFAULT_SETTINGS.taboutEnabled
				}
			},
			{
				name: i18next.t("tabout.closing-brackets.name"),
				desc: i18next.t("tabout.closing-brackets.desc"),
				control: {
					type: "text",
					key: "taboutClosingSymbols",
					defaultValue: DEFAULT_SETTINGS.taboutClosingSymbols
				}
			},
			{
				name: i18next.t("tabout.exit-EOL.name"),
				desc: i18next.t("tabout.exit-EOL.desc"),
				control: {
					type: "toggle",
					key: "taboutExitEquationOnlyOnEOL",
					defaultValue: DEFAULT_SETTINGS.taboutExitEquationOnlyOnEOL
				}
			}
		]
		return [{
			type: "page",
			name: i18next.t("tabout.heading"),
			items: settings
		}]
	}

	getAutoEnlargeBracketsDefinitions(): SettingDefinitionItem[] {
		const settings: AutoEnlargeBracketsSettingDefinition[] = [
			{
				name: i18next.t("auto-enlarge.enabled.name"),
				desc: i18next.t("auto-enlarge.enabled.desc"),
				control: {
					type: "toggle",
					key: "autoEnlargeBrackets",
					defaultValue: DEFAULT_SETTINGS.autoEnlargeBrackets
				}
			},
			{
				name: i18next.t("auto-enlarge.triggers.name"),
				desc: i18next.t("auto-enlarge.triggers.desc"),
				control: {
					type: "text",
					key: "autoEnlargeBracketsTriggers",
					defaultValue: DEFAULT_SETTINGS.autoEnlargeBracketsTriggers
				}
			},
			{
				name: i18next.t("auto-enlarge.space.name"),
				desc: i18next.t("auto-enlarge.space.desc"),
				control: {
					type: "toggle",
					key: "autoEnlargeBracketsSpace",
					defaultValue: DEFAULT_SETTINGS.autoEnlargeBracketsSpace
				}
			}
		]
		return [{
			type: "page",
			name: i18next.t("auto-enlarge.heading"),
			items: settings,
		}]
	}

	getVimSettingDefinitions(): SettingDefinitionItem[] {
		const settings: VimSettingDefinition[] = [
			{
				name: i18next.t("vim.enabled.name"),
				desc: i18next.t("vim.enabled.desc"),
				control: getToggleControl("vimEnabled")
			},
			{
				name: i18next.t("vim.select-mode.name"),
				desc: i18next.t("vim.select-mode.desc"),
				control: getTextControl("vimSelectMode"),
			},
			{
				name: i18next.t("vim.visual-mode.name"),
				desc: i18next.t("vim.visual-mode.desc"),
				control: getTextControl("vimVisualMode"),
			},
			{
				name: i18next.t("vim.matrix-enter.name"),
				desc: i18next.t("vim.matrix-enter.desc"),
				control: getTextControl("vimMatrixEnter"),
			}
		]
		return [{
			type: "page",
			name: "Vim",
			items: settings,
		}]
	}

	getKeyMapDefinitions(): SettingDefinitionItem[] {
		// typescript doesn't infer correctly here so using broader definition.
		const settings: SettingDefinition[] = ([
			["snippet", "snippetsTrigger"] ,
			["next-tabstop", "snippetNextTabstopTrigger"] ,
			["prev-tabstop", "snippetPreviousTabstopTrigger"] ,
			["tabout", "taboutTrigger"] ,
		] as const).map((keys) => ({
			name: i18next.t(`keymap.${keys[0]}`),
			control: {
				type: "text",
				key: keys[1],
				defaultValue: DEFAULT_SETTINGS[keys[1]],
		}}))
		
		return [{
			type: "page",
			name: i18next.t("keymap.heading.name"),
			desc: i18next.t("keymap.heading.desc"),
			items: [
				{
					name: " ",
					desc: renderMarkdown(this.app, i18next.t("keymap.desc")),
				},
				{
					type: "list",
					items: settings,
				},
			],
		}]
	}
	
	getExperimentalDefinitions(): SettingDefinitionItem[] {
		const settings: ExperimentalSettingDefinition[] = [
			{
				name: i18next.t("experimental.snippet-recursion.name"),
				desc: renderMarkdown(this.app, i18next.t("experimental.snippet-recursion.desc")),
				control: {
					type: "number",
					key: "snippetRecursion",
					defaultValue: DEFAULT_SETTINGS.snippetRecursion,
					min: 0,
				}
			}
		]
		

		return [{
			type: "page",
			name: i18next.t("experimental.heading.name"),
			items: settings,
		}]
	}

	fileSearch(setting: Setting, key: "snippetsFileLocation" | "snippetVariablesFileLocation") {
		setting.addSearch((component) => {
			component
				.setPlaceholder(DEFAULT_SETTINGS[key])
				.setValue(this.plugin.settings[key])
				.onChange(debounce(
					async (value) => {
						this.plugin.settings[key] = value;
						await this.plugin.saveSettings(true);
					},
					500,
					true,
				));

			let inputEl = component.inputEl;
			inputEl.addClass("latex-suite-location-input-el");
			new FileSuggest(this.app, inputEl);
		});
	}
}

function createSnippetsEditor(snippetsSetting: Setting, plugin: LatexSuitePlugin) {
	const customCSSWrapper = snippetsSetting.controlEl.createDiv("snippets-editor-wrapper");
	const snippetsFooter = snippetsSetting.controlEl.createDiv("snippets-footer");
	const validity = snippetsFooter.createDiv("snippets-editor-validity");

	const validityIndicator = new ExtraButtonComponent(validity);
	validityIndicator.setIcon("checkmark")
		.extraSettingsEl.addClass("snippets-editor-validity-indicator");

	const validityText = validity.createDiv("snippets-editor-validity-text");
	validityText.addClass("setting-item-description");

	function updateValidityIndicator(success: boolean) {
		validityIndicator.setIcon(success ? "checkmark" : "cross");
		validityIndicator.extraSettingsEl.removeClass(success ? "invalid" : "valid");
		validityIndicator.extraSettingsEl.addClass(success ? "valid" : "invalid");
		validityText.setText(success ? "Saved" : "Invalid syntax. Changes not saved");
	}


	const extensions = [...basicSetup];

	const change = EditorView.updateListener.of((v: ViewUpdate) => void (async () => {
		if (v.docChanged) {
			const snippets = v.state.doc.toString();
			let success = true;

			let snippetVariables;
			try {
				snippetVariables = await parseSnippetVariables(plugin.settings.snippetVariables, "snippet-variables.js");
				await parseSnippets(snippets, snippetVariables, "snippets.js");
			}
			catch {
				success = false;
			}

			updateValidityIndicator(success);

			if (!success) return;

			plugin.settings.snippets = snippets;
			await plugin.saveSettings();
		}
	})());

	extensions.push(change);

	const snippetsEditor = createCMEditor(plugin.settings.snippets, extensions, customCSSWrapper);


	const buttonsDiv = snippetsFooter.createDiv("snippets-editor-buttons");
	const reset = new ButtonComponent(buttonsDiv);
	reset.setIcon("switch")
		.setTooltip("Reset to default snippets")
		.onClick(async () => {
			new ConfirmationModal(plugin.app,
				"Are you sure? This will delete any custom snippets you have written.",
				button => void button
					.setButtonText("Reset to default snippets")
					.setWarning(),
				async () => {
					snippetsEditor.setState(EditorState.create({ doc: DEFAULT_SNIPPETS, extensions: extensions }));
					updateValidityIndicator(true);

					plugin.settings.snippets = DEFAULT_SNIPPETS;

					await plugin.saveSettings();
				}
			).open();
		});

	const remove = new ButtonComponent(buttonsDiv);
	remove.setIcon("trash")
		.setTooltip("Remove all snippets")
		.onClick(async () => {
			new ConfirmationModal(plugin.app,
				"Are you sure? This will delete any custom snippets you have written.",
				button => void button
					.setButtonText("Remove all snippets")
					.setWarning(),
				async () => {
					const value = `export default [

]`;
					snippetsEditor.setState(EditorState.create({ doc: value, extensions: extensions }));
					updateValidityIndicator(true);

					plugin.settings.snippets = value;
					await plugin.saveSettings();
				}
			).open();
		});
	return snippetsEditor
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

function createCMEditor(content: string, extensions: Extension[], node: Element) {
	const view = new EditorView({
		state: EditorState.create({ doc: content, extensions }),
		parent: node,
	});

	return view;
}

/**
 * IME support is tricky, currently only a fix for mobile platform is provided, update later if needed.
 * @returns Whether IME keyboards are supported
 */
export function isIMESupported(): boolean {
	return Platform.isMobileApp
}
function getTriggerHelpText(name: string) {
	const fragment = new DocumentFragment();
	fragment.createDiv({}, (div) => {
		div.appendText(
			`What key to press to trigger ${name}. Should follow codemirror keymap syntax such as "Ctrl-k Ctrl-a". For more info see `,
		);
		div.createEl("a", {
			attr: { href: "https://codemirror.net/docs/ref/#view.KeyBinding" },
			text: "codemirror keymap documentation",
		});
	});
	return fragment;
}

export function renderMarkdown(app: App, markdown: string) {
	const component = new Component()
	const fragment = new DocumentFragment()
	const span = fragment.createSpan()
	void MarkdownRenderer.render(app, markdown, span, "", component).then(() => {
		component.load()
		component.unload()
		// fragment.replaceChildren(...span.children)
	})
	return fragment
}

type toggles = keyof {
	[K in keyof LatexSuitePluginSettings as LatexSuitePluginSettings[K] extends boolean ? K : never]: unknown
};
type textSettings = keyof {
	[K in keyof LatexSuitePluginSettings as LatexSuitePluginSettings[K] extends string ? K : never]: unknown
};

function getToggleControl<T extends toggles>(key: T): SettingDefinitionControl<T>["control"] {
	return {
		type: "toggle",
		key,
		defaultValue: DEFAULT_SETTINGS[key],
	}
}
function getTextControl<T extends textSettings>(key: T): SettingDefinitionControl<T>["control"] {
	return {
		type: "text",
		key,
		defaultValue: DEFAULT_SETTINGS[key],
	}
}
