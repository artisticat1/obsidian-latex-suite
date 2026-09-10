import { EditorView } from "@codemirror/view";
import { Facet, EditorState } from "@codemirror/state";
import { type LatexSuiteCMSettings, processLatexSuiteSettings, DEFAULT_SETTINGS } from "src/settings/settings";
import { default_mapping } from "src/editor_extensions/conceal_maps";

export const latexSuiteConfig = Facet.define<LatexSuiteCMSettings, LatexSuiteCMSettings>({
    combine: (input) => {
        const settings = input.length > 0 ? input[0] : processLatexSuiteSettings([], DEFAULT_SETTINGS, [default_mapping]);
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
