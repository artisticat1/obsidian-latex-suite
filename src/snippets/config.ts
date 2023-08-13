import { EditorView } from "@codemirror/view";
import { Facet, Compartment } from "@codemirror/state";
import { LatexSuiteProcessedSettings, processLatexSuiteSettings, DEFAULT_SETTINGS } from "src/settings";

export const latexSuiteConfig = Facet.define<LatexSuiteProcessedSettings, LatexSuiteProcessedSettings>({
    combine: (input) => {
        const settings = input.length > 0 ? input[0] : processLatexSuiteSettings(DEFAULT_SETTINGS);
        return settings;
    }
});

export function getLatexSuiteConfigFromView(view: EditorView) {
    return view.state.facet(latexSuiteConfig);
}

export const latexSuiteConfigCompartment = new Compartment();

export function getLatexSuiteConfigExtension(pluginSettings: LatexSuiteProcessedSettings) {
    return latexSuiteConfigCompartment.of(latexSuiteConfig.of(pluginSettings));
}

export function reconfigureLatexSuiteConfig(pluginSettings: LatexSuiteProcessedSettings) {
    return latexSuiteConfigCompartment.reconfigure(latexSuiteConfig.of(pluginSettings));
}