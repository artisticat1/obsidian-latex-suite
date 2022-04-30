import { App, PluginSettingTab, Setting, Modal, ButtonComponent, ExtraButtonComponent } from "obsidian";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
import { basicSetup } from "./editor/extensions";


import { DEFAULT_SNIPPETS } from "./default_snippets";
import LatexSuitePlugin from "./main";

export interface LatexSuiteSettings {
	snippets: string;
    snippetsEnabled: boolean;
    autofractionEnabled: boolean;
    autofractionExcludedEnvs: string,
    autofractionSpaceAfterGreekLetters: boolean,
    concealEnabled: boolean,
    matrixShortcutsEnabled: boolean;
    matrixShortcutsEnvNames: string;
    taboutEnabled: boolean;
    autoEnlargeBrackets: boolean;
    autoEnlargeBracketsTriggers: string;
}

export const DEFAULT_SETTINGS: LatexSuiteSettings = {
	snippets: DEFAULT_SNIPPETS,
    snippetsEnabled: true,
    autofractionEnabled: true,
    autofractionExcludedEnvs:
    `[
        ["^{", "}"],
        ["\\\\pu{", "}"]
]`,
    autofractionSpaceAfterGreekLetters: true,
    concealEnabled: false,
    matrixShortcutsEnabled: true,
    matrixShortcutsEnvNames: "pmatrix, cases, align, bmatrix, Bmatrix, vmatrix, Vmatrix, array, matrix",
    taboutEnabled: true,
    autoEnlargeBrackets: true,
    autoEnlargeBracketsTriggers: "sum, int, frac, prod"
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

		containerEl.createEl("h4", {text: "Snippets"});


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



        containerEl.createEl("h4", {text: "Auto-fraction"});

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
            .setName("Allow spaces after greek letters")
            .setDesc(`When enabled, expands "\\pi R/" to "\\frac{\\pi R}{}". When disabled, expands "\\pi R/" to "\\pi \\frac{R}{}".
            Enables greek letters to be used inside of numerators.`)
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autofractionSpaceAfterGreekLetters)
                .onChange(async (value) => {
                    this.plugin.settings.autofractionSpaceAfterGreekLetters = value;
                    await this.plugin.saveSettings();
                }));



        containerEl.createEl("h4", {text: "Conceal"});

        new Setting(containerEl)
            .setName("Enabled")
            .setDesc(`Displays LaTeX code in a pretty format when it isn't being edited.\n e.g. \\dot{x}^{2} + \\dot{y}^{2} will display as ẋ² + ẏ²,
            and \\sqrt{ 1-\\beta^{2} } will display as √{ 1-β² }.`)
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.concealEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.concealEnabled = value;

                    if (value) {
                        this.plugin.enableConceal();
                    }
                    else {
                        this.plugin.disableConceal();
                    }

                    await this.plugin.saveSettings();
                }));


        containerEl.createEl("h4", {text: "Matrix shortcuts"});

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


        containerEl.createEl("h4", {text: "Tabout"});

        new Setting(containerEl)
            .setName("Enabled")
            .setDesc("Whether tabout is enabled.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.taboutEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.taboutEnabled = value;
                    await this.plugin.saveSettings();
                }));


        containerEl.createEl("h4", {text: "Auto-enlarge brackets"});

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