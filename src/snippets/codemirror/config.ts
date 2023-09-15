import { EditorView } from "@codemirror/view";
import { Facet, Compartment, EditorState } from "@codemirror/state";
import { LatexSuiteProcessedSettings, processLatexSuiteSettings, DEFAULT_SETTINGS } from "src/settings/settings";

export const latexSuiteConfig = Facet.define<LatexSuiteProcessedSettings, LatexSuiteProcessedSettings>({
    combine: (input) => {
        const settings = input.length > 0 ? input[0] : processLatexSuiteSettings([], DEFAULT_SETTINGS);
        return settings;
    }
});

export function getLatexSuiteConfig(viewOrState: EditorView | EditorState) {
    const state = viewOrState instanceof EditorView ? viewOrState.state : viewOrState;

    return state.facet(latexSuiteConfig);
}

export const latexSuiteConfigCompartment = new Compartment();

export function getLatexSuiteConfigExtension(pluginSettings: LatexSuiteProcessedSettings) {
    return latexSuiteConfigCompartment.of(latexSuiteConfig.of(pluginSettings));
}

export function reconfigureLatexSuiteConfig(pluginSettings: LatexSuiteProcessedSettings) {
    return latexSuiteConfigCompartment.reconfigure(latexSuiteConfig.of(pluginSettings));
}