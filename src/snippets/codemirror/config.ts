import { EditorView } from "@codemirror/view";
import { Facet, EditorState } from "@codemirror/state";
import { LatexSuiteCMSettings, processLatexSuiteSettings, DEFAULT_SETTINGS } from "src/settings/settings";

export const latexSuiteConfig = Facet.define<LatexSuiteCMSettings, LatexSuiteCMSettings>({
    combine: (input) => {
        const settings = input.length > 0 ? input[0] : processLatexSuiteSettings([], DEFAULT_SETTINGS);
        return settings;
    }
});

export function getLatexSuiteConfig(viewOrState: EditorView | EditorState) {
    const state = viewOrState instanceof EditorView ? viewOrState.state : viewOrState;

    return state.facet(latexSuiteConfig);
}

export function getLatexSuiteConfigExtension(pluginSettings: LatexSuiteCMSettings) {
    return latexSuiteConfig.of(pluginSettings);
}
