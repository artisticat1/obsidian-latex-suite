import { EditorView } from "@codemirror/view";
import { Facet, EditorState } from "@codemirror/state";
import { LatexSuiteCMSettings, processLatexSuiteSettings, DEFAULT_SETTINGS } from "src/settings/settings";
import { TFile } from "obsidian";

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


export const fileConfig = Facet.define<{getFile: () => TFile | null}, {getFile: () => TFile | null}>({
    combine: (input) => {
        return input.length > 0 ? input[0] : { getFile: () => null };
    }
});

export function getFileConfig(viewOrState: EditorView | EditorState) {
	const state = viewOrState instanceof EditorView ? viewOrState.state : viewOrState;
	return state.facet(fileConfig);
}

export function getFileConfigExtension(getFile: () => TFile | null) {
	return fileConfig.of({ getFile });
}
