import { App, PluginSettingTab, Setting, Modal, ButtonComponent, ExtraButtonComponent } from "obsidian";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
import { basicSetup } from "./snippets_editor/extensions";


import { DEFAULT_SNIPPETS } from "./default_snippets";
import LatexSuitePlugin from "./main";
import { concealPlugin } from "./editor_extensions/conceal";
import { colorPairedBracketsPluginLowestPrec, highlightCursorBracketsPlugin } from "./editor_extensions/highlight_brackets";
import { cursorTooltipBaseTheme, cursorTooltipField } from "./editor_extensions/inline_math_tooltip";
import { FileSuggest } from "./ui/file_suggest";
import { debouncedSetSnippetsFromFileOrFolder } from "./snippets/snippet_helper_functions";


export interface LatexSuiteSettings {
    snippets: string;
    snippetsEnabled: boolean;
    loadSnippetsFromFile: boolean;
    snippetsFileLocation: string;
    autofractionEnabled: boolean;
    concealEnabled: boolean,
    colorPairedBracketsEnabled: boolean;
    highlightCursorBracketsEnabled: boolean;
    inlineMathPreviewEnabled: boolean;
    autofractionExcludedEnvs: string,
    autofractionBreakingChars: string;
    matrixShortcutsEnabled: boolean;
    matrixShortcutsEnvNames: string;
    taboutEnabled: boolean;
    autoEnlargeBrackets: boolean;
    autoEnlargeBracketsTriggers: string;
    wordDelimiters: string;
}

export const DEFAULT_SETTINGS: LatexSuiteSettings = {
    snippets: DEFAULT_SNIPPETS,
    snippetsEnabled: true,
    loadSnippetsFromFile: false,
    snippetsFileLocation: "",
    concealEnabled: false,
    colorPairedBracketsEnabled: true,
    highlightCursorBracketsEnabled: true,
    inlineMathPreviewEnabled: true,
    autofractionEnabled: true,
    autofractionExcludedEnvs:
    `[
        ["^{", "}"],
        ["\\\\pu{", "}"]
]`,
    autofractionBreakingChars: "+-=",
    matrixShortcutsEnabled: true,
    matrixShortcutsEnvNames: "pmatrix, cases, align, bmatrix, Bmatrix, vmatrix, Vmatrix, array, matrix",
    taboutEnabled: true,
    autoEnlargeBrackets: true,
    autoEnlargeBracketsTriggers: "sum, int, frac, prod",
    wordDelimiters: "., -\\n:;!?\\/{}[]()=~"
}


export class LatexSuiteSettingTab extends PluginSettingTab {
	plugin: LatexSuitePlugin;
    snippetsEditor: EditorView;

	constructor(app: App, plugin: LatexSuitePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}


    hide() {
        this.snippetsEditor?.destroy();
    }


	display(): void {
		const {containerEl} = this;

		containerEl.empty();

        containerEl.createEl('div', {text: "Snippets"}).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);


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

        const change = EditorView.updateListener.of(async (v:ViewUpdate) => {
            if (v.docChanged) {
                const value = v.state.doc.toString();
                let success = true;

                try {
                    this.plugin.setSnippets(value);
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

        this.snippetsEditor = createSnippetsEditor(this.plugin.settings.snippets, extensions);
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

                    this.plugin.setSnippets(DEFAULT_SNIPPETS);
                    this.plugin.settings.snippets = DEFAULT_SNIPPETS;

                    await this.plugin.saveSettings();
                },
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

                    this.plugin.setSnippets(value);
                    this.plugin.settings.snippets = value;
                    await this.plugin.saveSettings();
                },
            ).open();
        });



        let snippetsFileLocEl:HTMLElement;

        new Setting(containerEl)
        .setName("Load snippets from file or folder")
        .setDesc("Whether to load snippets from a specified file, or from all files within a folder (instead of from the plugin settings).")
        .addToggle(toggle => toggle
            .setValue(this.plugin.settings.loadSnippetsFromFile)
            .onChange(async (value) => {
                this.plugin.settings.loadSnippetsFromFile = value;

                snippetsSetting.settingEl.toggleClass("hidden", value);
                snippetsFileLocEl.toggleClass("hidden", !value);

                if (value) {
                    debouncedSetSnippetsFromFileOrFolder(this.plugin);
                }
                else {
                    this.plugin.setSnippets(this.plugin.settings.snippets);
                }

                await this.plugin.saveSettings();
            }));


        const snippetsFileLoc = new Setting(containerEl)
        .setName("Snippets file or folder location")
        .setDesc("The file or folder to load snippets from.");


        let inputEl;
        snippetsFileLoc.addText(text => {
                text
                .setPlaceholder(DEFAULT_SETTINGS.snippetsFileLocation)
                .setValue(this.plugin.settings.snippetsFileLocation)
                .onChange(async (value) => {
                    this.plugin.settings.snippetsFileLocation = value;

                    debouncedSetSnippetsFromFileOrFolder(this.plugin);

                    await this.plugin.saveSettings();
                });

                inputEl = text.inputEl;
            }
        );

        snippetsFileLocEl = snippetsFileLoc.settingEl;
        new FileSuggest(this.app, inputEl);
        

        // Hide settings that are not relevant when "loadSnippetsFromFile" is set to true/false
        const loadSnippetsFromFile = this.plugin.settings.loadSnippetsFromFile;
        snippetsSetting.settingEl.toggleClass("hidden", loadSnippetsFromFile);
        snippetsFileLocEl.toggleClass("hidden", !loadSnippetsFromFile);



        containerEl.createEl('div', {text: "Conceal"}).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

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
                .setValue(this.plugin.settings.concealEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.concealEnabled = value;

                    if (value) {
                        this.plugin.enableExtension(concealPlugin.extension);
                    }
                    else {
                        this.plugin.disableExtension(concealPlugin.extension);
                    }

                    await this.plugin.saveSettings();
                }));


        containerEl.createEl('div', {text: "Highlight and color brackets"}).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

        new Setting(containerEl)
            .setName("Color paired brackets")
            .setDesc("Whether to colorize matching brackets.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.colorPairedBracketsEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.colorPairedBracketsEnabled = value;

                    if (value) {
                        // Use Prec.lowest so that "color matching brackets" still works when "conceal" is enabled after it
                        this.plugin.enableExtension(colorPairedBracketsPluginLowestPrec);
                    }
                    else {
                        this.plugin.disableExtension(colorPairedBracketsPluginLowestPrec);
                    }

                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
        .setName("Highlight matching bracket beneath cursor")
        .setDesc("When the cursor is adjacent to a bracket, highlight the matching bracket.")
        .addToggle(toggle => toggle
            .setValue(this.plugin.settings.highlightCursorBracketsEnabled)
            .onChange(async (value) => {
                this.plugin.settings.highlightCursorBracketsEnabled = value;

                if (value) {
                    this.plugin.enableExtension(highlightCursorBracketsPlugin.extension);
                }
                else {
                    this.plugin.disableExtension(highlightCursorBracketsPlugin.extension);
                }

                await this.plugin.saveSettings();
            }));



        containerEl.createEl('div', {text: "Inline math preview"}).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

            new Setting(containerEl)
                .setName("Enabled")
                .setDesc("When inside inline math, show a popup preview window of the rendered math.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.inlineMathPreviewEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.inlineMathPreviewEnabled = value;
    
                        if (value) {
                            this.plugin.enableExtension(cursorTooltipField);
                            this.plugin.enableExtension(cursorTooltipBaseTheme);
                        }
                        else {
                            this.plugin.disableExtension(cursorTooltipField);
                            this.plugin.disableExtension(cursorTooltipBaseTheme);
                        }
    
                        await this.plugin.saveSettings();
                    }));



        containerEl.createEl('div', {text: "Auto-fraction"}).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

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
            .setName("Excluded environments")
            .setDesc("A list of environments to exclude auto-fraction from running in. For example, to exclude auto-fraction from running while inside an exponent, such as e^{...}, use  [\"^{\", \"}\"]")
            .addTextArea(text => text
				.setPlaceholder("[ [\"^{\", \"}] ]")
				.setValue(this.plugin.settings.autofractionExcludedEnvs)
				.onChange(async (value) => {

                    this.plugin.setAutofractionExcludedEnvs(value);

					this.plugin.settings.autofractionExcludedEnvs = value;
					await this.plugin.saveSettings();
				}));


        new Setting(containerEl)
            .setName("Breaking characters")
            .setDesc(`A list of characters that denote the start/end of a fraction. e.g. if + is included in the list, "a+b/c" will expand to "a+\\frac{b}{c}". If + is not in the list, it will expand to "\\frac{a+b}{c}".`)
            .addText(text => text
                .setPlaceholder(DEFAULT_SETTINGS.autofractionBreakingChars)
                .setValue(this.plugin.settings.autofractionBreakingChars)
                .onChange(async (value) => {
                    this.plugin.settings.autofractionBreakingChars = value;

                    await this.plugin.saveSettings();
                }));


        containerEl.createEl('div', {text: "Matrix shortcuts"}).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

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
                    this.plugin.matrixShortcutsEnvNames = value.replace(/\s/g,"").split(",");

                    await this.plugin.saveSettings();
                }));


        containerEl.createEl('div', {text: "Tabout"}).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

        new Setting(containerEl)
            .setName("Enabled")
            .setDesc("Whether tabout is enabled.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.taboutEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.taboutEnabled = value;
                    await this.plugin.saveSettings();
                }));


        containerEl.createEl('div', {text: "Auto-enlarge brackets"}).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

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
                    this.plugin.autoEnlargeBracketsTriggers = value.replace(/\s/g,"").split(",");

                    await this.plugin.saveSettings();
                }));


        containerEl.createEl('div', {text: "Misc"}).addClasses(["setting-item", "setting-item-heading", "setting-item-name"]);

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
                })
            })
            .addButton(button => button
                .setButtonText("Cancel")
                .onClick(() => this.close()));
    }
}




function createSnippetsEditor(content: string, extensions: Extension[]) {
    const view = new EditorView({
        state: EditorState.create({ doc: content, extensions }),
    });

    return view;
}