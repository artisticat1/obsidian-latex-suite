import { App, ButtonComponent, Component, debounce, ExtraButtonComponent, MarkdownRenderer, Modal, Platform, Setting, SettingDefinition, SettingDefinitionControl, SettingDefinitionItem, SettingTab } from "obsidian"
import { DEFAULT_SETTINGS, EnvironmentSchema, LatexSuitePluginSettings } from "./settings"
import { settings_translation as t } from "../i18n/i18n"
import { EditorState, Extension } from "@codemirror/state"
import { EditorView, ViewUpdate } from "@codemirror/view"
import { parseSnippetVariables, parseSnippets } from "src/snippets/parse"
import { basicSetup } from "./ui/snippets_editor/extensions"
import LatexSuitePlugin from "src/main"
import { FileSuggest } from "./ui/file_suggest"
import * as v from "valibot"
import { buttonSetWarning } from "./settings_tab"


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
	snippetVariablesEditor: EditorView | null = null;
	component = new Component();

	constructor(
		public app: App,
		public plugin: LatexSuitePlugin,
	) {
		super();
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		this.component.unload()
		const definitions: SettingDefinitionItem[] = [
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
		this.component.load()
		return definitions
	}

	getSnippetDefinitions(): SettingDefinitionItem[] {
		const snippets: SnippetSettingDefinition[] = [];
		snippets.push(
			{
				name: t("snippets.enabled.name"),
				desc: this.renderMarkdown( t("snippets.enabled.desc")),
				control: getToggleControl("snippetsEnabled"),
			},
			{
				name: t("snippets.snippets.name"),
				desc: this.renderMarkdown(t("snippets.snippets.desc")),
				render: (setting) => {
					this.snippetsEditor?.destroy()
					this.snippetsEditor = createSnippetsEditor(setting, this.plugin, {
						type: "snippets",
						validate: async (value) => {
							const snippetVariables = await parseSnippetVariables(this.plugin.settings.snippetVariables, "snippet-variables.js");
							await parseSnippets(value, snippetVariables, "snippets.js");
						},
						deleted: "export default [\n\n]"
					});
				},
				visible: () => !this.plugin.settings.loadSnippetsFromFile,
			},
			{
				name: t("snippets.load-from-file.name"),
				desc: this.renderMarkdown(t("snippets.load-from-file.desc")),
				control: getToggleControl("loadSnippetsFromFile")
			},
			{
				name: t("snippets.file-path.name"),
				desc: this.renderMarkdown(t("snippets.file-path.desc")),
				render: (setting) => {
					this.fileSearch(setting, "snippetsFileLocation")
				},
				visible: () => this.plugin.settings.loadSnippetsFromFile,
			},
		);
		const advanced: AdvancedSnippetSettingDefinition[] = [
			{
				name: t("advanced-snippets.variables.name"),
				desc: this.renderMarkdown(t("advanced-snippets.variables.desc")),
				render: (setting) => {
					this.snippetVariablesEditor?.destroy()
					this.snippetVariablesEditor = createSnippetsEditor(setting, this.plugin, {
						type: "snippetVariables",
						validate: async (value) => {
							await parseSnippetVariables(value, "snippet-variables.js")
						},
						deleted: "export default {\n\n}"
					})
				},
				visible: () => !this.plugin.settings.loadSnippetVariablesFromFile
			},
			{
				name: t("advanced-snippets.load-variables-from-file.name"),
				desc: this.renderMarkdown(t("advanced-snippets.load-variables-from-file.desc")),
				control: getToggleControl("loadSnippetVariablesFromFile"),
			},
			{
				name: t("advanced-snippets.variables-file-path.name"),
				desc: this.renderMarkdown(t("advanced-snippets.variables-file-path.desc")),
				render: (setting) => {
					this.fileSearch(setting, "snippetVariablesFileLocation")
				},
				visible: () => this.plugin.settings.loadSnippetVariablesFromFile
			},
			{
				name: t("advanced-snippets.word-delimiters.name"),
				desc: this.renderMarkdown(t("advanced-snippets.word-delimiters.desc")),
				control: {
					type: "text",
					key: "wordDelimiters",
					defaultValue: DEFAULT_SETTINGS.wordDelimiters,
				}
			},
			{
				name: t("advanced-snippets.trailing-whitespace.name"),
				desc: this.renderMarkdown(t("advanced-snippets.trailing-whitespace.desc")),
				control: getToggleControl("removeSnippetWhitespace")
			},
			{
				name: t("advanced-snippets.auto-delete$.name"),
				desc: this.renderMarkdown(t("advanced-snippets.auto-delete$.desc")),
				control: getToggleControl("autoDelete$")
			},
			{
				name: t("advanced-snippets.suppress-IME-warning.name"),
				desc: this.renderMarkdown(t("advanced-snippets.suppress-IME-warning.desc")),
				control: getToggleControl("suppressIMEWarning"),
				visible: () => isIMESupported() && this.plugin.settings.suppressSnippetTriggerOnIME
			},
			{
				name: t("advanced-snippets.suppress-IME.name"),
				desc: this.renderMarkdown(t("advanced-snippets.suppress-IME.desc")),
				control: getToggleControl("suppressSnippetTriggerOnIME"),
			},
			{
				name: t("advanced-snippets.code-languages.name"),
				desc: this.renderMarkdown(t("advanced-snippets.code-languages.desc")),
				control: getTextControl("forceMathLanguages")
			},
			{
				name: t("advanced-snippets.snippet-debug-mode.name"),
				desc: this.renderMarkdown(t("advanced-snippets.snippet-debug-mode.desc")),
				control: {
					type: "dropdown",
					key: "snippetDebug",
					options: {
						off: t("advanced-snippets.snippet-debug-mode.options.off"),
						info: t("advanced-snippets.snippet-debug-mode.options.info"),
						verbose: t("advanced-snippets.snippet-debug-mode.options.verbose")
					},
					defaultValue: DEFAULT_SETTINGS.snippetDebug
				}
			}
		]
		return [{
			type: "page",
			name: t("snippets.heading"),
			items: [...snippets, {
				type: "group",
				heading: t("advanced-snippets.heading"),
				items: advanced
			}],
		}]
	}

	getConcealDefinitions(): SettingDefinitionItem[] {
		const settings: ConcealSettingDefinition[] = [
			{
				name: t("conceal.enabled.name"),
				desc: this.renderMarkdown( t("conceal.enabled.desc")),
				control: getToggleControl("concealEnabled")
			},
			{
				name: t("conceal.reveal-delay.name"),
				desc: this.renderMarkdown( t("conceal.reveal-delay.desc")),
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
			name: t("conceal.heading"),
			items: settings,
		}]
	}

	getColorHighlightBracketsDefinitions(): SettingDefinitionItem[] {
		const settings: ColorHighlightSettingDefinition[] = [
			{
				name: t("highlight-brackets.color-brackets.name"),
				desc: this.renderMarkdown(t("highlight-brackets.color-brackets.desc")),
				control: getToggleControl("colorPairedBracketsEnabled")
			},
			{
				name: t("highlight-brackets.highlight-brackets.name"),
				desc: this.renderMarkdown(t("highlight-brackets.highlight-brackets.desc")),
				control: getToggleControl("highlightCursorBracketsEnabled")
			},
			{
				name: t("highlight-brackets.color-math.name"),
				desc: this.renderMarkdown(t("highlight-brackets.color-math.desc")),
				control: getToggleControl("highlightDollarEnabled")
			}
		]
		return [{
			type: "page",
			name: t("highlight-brackets.heading"),
			items: settings
		}]
	}

	getPopupPreviewDefinitions(): SettingDefinitionItem[] {
		const settings: PopupPreviewSettingDefinition[] = [
			{
				name: t("math-preview.enabled.name"),
				desc: this.renderMarkdown( t("math-preview.enabled.desc")),
				control: getToggleControl("mathPreviewEnabled")
			},
			{
				name: t("math-preview.position.name"),
				desc: this.renderMarkdown(t("math-preview.position.desc")),
				render: (setting) => {
					setting.addDropdown((dropdown) => dropdown
						.addOption("above", t("math-preview.position.options.above"))
						.addOption("below", t("math-preview.position.options.below"))
						.setValue(this.plugin.settings.mathPreviewPositionIsAbove ? "above" : "below")
						.onChange(async (value) => {
							this.plugin.settings.mathPreviewPositionIsAbove = value === "above";
							await this.plugin.saveSettings();
						})
					)
				}
			},
			{
				name: t("math-preview.cursor-symbol.name"),
				desc: this.renderMarkdown(t("math-preview.cursor-symbol.desc")),
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
				name: t("math-preview.highlight-brackets.name"),
				desc: this.renderMarkdown(t("math-preview.highlight-brackets.desc")),
				control: getToggleControl("mathPreviewBracketHighlighting")
			},
			{
				name: t("math-preview.display-live-preview.name"),
				desc: this.renderMarkdown(t("math-preview.display-live-preview.desc")),
				control: getToggleControl("mathPreviewLivePreviewDisplay")
			}
		]
		return [{
			type: "page",
			name: t("math-preview.heading"),
			items: settings,
		}]
	}

	getAutofractionDefinitions(): SettingDefinitionItem[] {
		const settings: AutofractionSettingDefinition[] = [
			{
				name: t("auto-fraction.enabled.name"),
				desc: this.renderMarkdown(t("auto-fraction.enabled.desc")),
				control: getToggleControl("autofractionEnabled")
			},
			{
				name: t("auto-fraction.fraction-symbol.name"),
				desc: this.renderMarkdown( t("auto-fraction.fraction-symbol.desc")),
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
				name: t("auto-fraction.excluded-environments.name"),
				desc: this.renderMarkdown(t("auto-fraction.excluded-environments.desc")),
				control: {
					key: "autofractionExcludedEnvs",
					type: "textarea",
					defaultValue: DEFAULT_SETTINGS.autofractionExcludedEnvs,
					validate: (value) => {
						try {
							v.parse(EnvironmentSchema, value);
						} catch (e) {
							console.error(e)
							return "Invalid environment format. Error: " + (e as {message: string}).message;
						}
					}
				},
			},
			{
				name: t("auto-fraction.breaking-characters.name"),
				desc: this.renderMarkdown(t("auto-fraction.breaking-characters.desc")),
				control: {
					key: "autofractionBreakingChars",
					type: "text",
					defaultValue: DEFAULT_SETTINGS.autofractionBreakingChars
				}
			}
		]

		return [{
			type: "page",
			name: t("auto-fraction.heading"),
			items: settings,
		}]
	}

	getMatrixShortcutsDefinitions(): SettingDefinitionItem[] {
		const settings: MatrixShortcutsSettingDefinition[] = [
			{
				name: t("matrix-shortcuts.enabled.name"),
				desc: this.renderMarkdown(t("matrix-shortcuts.enabled.desc")),
				control: getToggleControl("matrixShortcutsEnabled")
			},
			{
				name: t("matrix-shortcuts.environments.name"),
				desc: this.renderMarkdown(t("matrix-shortcuts.environments.desc")),
				control: {
					key: "matrixShortcutsEnvNames",
					type: "text",
					defaultValue: DEFAULT_SETTINGS.matrixShortcutsEnvNames
				}
			},
			{
				name: t("matrix-shortcuts.macros.name"),
				desc: this.renderMarkdown(t("matrix-shortcuts.macros.desc")),
				control: {
					key: "matrixShortcutsMacroNames",
					type: "text",
					defaultValue: DEFAULT_SETTINGS.matrixShortcutsMacroNames
				}
			}
		]
		return [{
			type: "page",
			name: t("matrix-shortcuts.heading"),
			items: settings,
		}]
	}

	getTaboutDefinitions(): SettingDefinitionItem[] {
		const settings: TaboutSettingDefinition[] = [
			{
				name: t("tabout.enabled.name"),
				desc: this.renderMarkdown(t("tabout.enabled.desc")),
				control: getToggleControl("taboutEnabled")
			},
			{
				name: t("tabout.closing-brackets.name"),
				desc: this.renderMarkdown(t("tabout.closing-brackets.desc")),
				control: {
					type: "text",
					key: "taboutClosingSymbols",
					defaultValue: DEFAULT_SETTINGS.taboutClosingSymbols
				}
			},
			{
				name: t("tabout.exit-EOL.name"),
				desc: this.renderMarkdown(t("tabout.exit-EOL.desc")),
				control: getToggleControl("taboutExitEquationOnlyOnEOL")
			}
		]
		return [{
			type: "page",
			name: t("tabout.heading"),
			items: settings
		}]
	}

	getAutoEnlargeBracketsDefinitions(): SettingDefinitionItem[] {
		const settings: AutoEnlargeBracketsSettingDefinition[] = [
			{
				name: t("auto-enlarge.enabled.name"),
				desc: this.renderMarkdown(t("auto-enlarge.enabled.desc")),
				control: getToggleControl("autoEnlargeBrackets")
			},
			{
				name: t("auto-enlarge.triggers.name"),
				desc: this.renderMarkdown(t("auto-enlarge.triggers.desc")),
				control: {
					type: "text",
					key: "autoEnlargeBracketsTriggers",
					defaultValue: DEFAULT_SETTINGS.autoEnlargeBracketsTriggers
				}
			},
			{
				name: t("auto-enlarge.space.name"),
				desc: this.renderMarkdown(t("auto-enlarge.space.desc")),
				control: getToggleControl("autoEnlargeBracketsSpace")
			}
		]
		return [{
			type: "page",
			name: t("auto-enlarge.heading"),
			items: settings,
		}]
	}

	getVimSettingDefinitions(): SettingDefinitionItem[] {
		const settings: VimSettingDefinition[] = [
			{
				name: t("vim.enabled.name"),
				desc: this.renderMarkdown(t("vim.enabled.desc")),
				control: getToggleControl("vimEnabled")
			},
			{
				name: t("vim.select-mode.name"),
				desc: this.renderMarkdown(t("vim.select-mode.desc")),
				control: getTextControl("vimSelectMode"),
			},
			{
				name: t("vim.visual-mode.name"),
				desc: this.renderMarkdown(t("vim.visual-mode.desc")),
				control: getTextControl("vimVisualMode"),
			},
			{
				name: t("vim.matrix-enter.name"),
				desc: this.renderMarkdown(t("vim.matrix-enter.desc")),
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
			name: t(`keymap.${keys[0]}`),
			control: {
				type: "text",
				key: keys[1],
				defaultValue: DEFAULT_SETTINGS[keys[1]],
		}}))
		
		return [{
			type: "page",
			name: t("keymap.heading.name"),
			desc: this.renderMarkdown(t("keymap.heading.desc")),
			items: [
				{
					name: " ",
					desc: this.renderMarkdown( t("keymap.desc")),
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
				name: t("experimental.snippet-recursion.name"),
				desc: this.renderMarkdown( t("experimental.snippet-recursion.desc")),
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
			name: t("experimental.heading.name"),
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

	renderMarkdown(source: string) {
		const fragment = new DocumentFragment()
		const span = fragment.createSpan()
		// Don't render right on startup, but have something rendered.
		span.setText(source)
		void MarkdownRenderer.render(this.app, source, span, "", this.component).then(() => {
			span.replaceChildren(...Array.from(span.children).map(child => {
				if (child.tagName === "P") {
					child.addClass("latex-suite-markdown-p")
				}
				return child
			})
			)
		})
		return fragment
	}
}

function createSnippetsEditor(
	snippetsSetting: Setting,
	plugin: LatexSuitePlugin,
	config: {
		type: "snippets" | "snippetVariables";
		validate: (value: string) => Promise<void>;
		deleted: string;
	},
): EditorView {
	snippetsSetting.setClass("snippets-text-area");
	const customCSSWrapper = snippetsSetting.controlEl.createDiv(
		"snippets-editor-wrapper",
	);
	const snippetsFooter =
		snippetsSetting.controlEl.createDiv("snippets-footer");
	const validity = snippetsFooter.createDiv("snippets-editor-validity");

	const validityIndicator = new ExtraButtonComponent(validity);
	validityIndicator
		.setIcon("checkmark")
		.extraSettingsEl.addClass("snippets-editor-validity-indicator");

	const validityText = validity.createDiv("snippets-editor-validity-text");
	validityText.addClass("setting-item-description");

	function updateValidityIndicator(success: boolean) {
		validityIndicator.setIcon(success ? "checkmark" : "cross");
		validityIndicator.extraSettingsEl.removeClass(
			success ? "invalid" : "valid",
		);
		validityIndicator.extraSettingsEl.addClass(
			success ? "valid" : "invalid",
		);
		validityText.setText(
			success ? "Saved" : "Invalid syntax. Changes not saved",
		);
	}

	const extensions = [...basicSetup];
	
	const debouncedValidityIndicator = debounce(async (state: EditorState) => {
		const snippets = state.doc.toString();
		let success = true;

		try {
			await config.validate(snippets);
		} catch {
			success = false;
		}

		updateValidityIndicator(success);

		if (!success) return;

		plugin.settings[config.type] = snippets;
		await plugin.saveSettings();
	}, 500);

	const change = EditorView.updateListener.of(
		(v: ViewUpdate) =>
			void (async () => {
		if (v.docChanged) {
			debouncedValidityIndicator(v.state);
		}
			})(),
	);

	extensions.push(change);

	const snippetsEditor = createCMEditor(
		plugin.settings[config.type],
		extensions,
		customCSSWrapper,
	);

	const buttonsDiv = snippetsFooter.createDiv("snippets-editor-buttons");
	const reset = new ButtonComponent(buttonsDiv);
	reset
		.setIcon("switch")
		.setTooltip("Reset to default snippets")
		.onClick(async () => {
			new ConfirmationModal(
				plugin.app,
				"Are you sure? This will delete any custom snippets you have written.",
				(button) =>
					void buttonSetWarning(button)
					.setButtonText("Reset to default snippets"),
				async () => {
					snippetsEditor.setState(
						EditorState.create({
							doc: DEFAULT_SETTINGS[config.type],
							extensions: extensions,
						}),
					);
					updateValidityIndicator(true);

					plugin.settings[config.type] =
						DEFAULT_SETTINGS[config.type];

					await plugin.saveSettings();
				},
			).open();
		});

	const remove = new ButtonComponent(buttonsDiv);
	remove
		.setIcon("trash")
		.setTooltip("Remove all snippets")
		.onClick(async () => {
			new ConfirmationModal(
				plugin.app,
				"Are you sure? This will delete any custom snippets you have written.",
				(button) =>
					void buttonSetWarning(button)
					.setButtonText("Remove all snippets"),
				async () => {
					const value = config.deleted
					snippetsEditor.setState(
						EditorState.create({
							doc: value,
							extensions: extensions,
						}),
					);
					updateValidityIndicator(true);

					plugin.settings[config.type] = value;
					await plugin.saveSettings();
				},
			).open();
		});
	return snippetsEditor;
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
export function renderMarkdown(app: App, markdown: string) {
	const component = new Component()
	const fragment = new DocumentFragment()
	const span = fragment.createSpan()
	span.setText(markdown)
	void MarkdownRenderer.render(app, markdown, span, "", component).then(() => {
		span.replaceChildren(...Array.from(span.children).map(child => {
			if (child.tagName === "P") {
				child.addClass("latex-suite-markdown-p")
			}
			return child
		})
		)
	})
	component.unload()
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
