import { EditorView } from "@codemirror/view";
import { Facet, EditorState } from "@codemirror/state";
import { type LatexSuiteCMSettings, processLatexSuiteSettings, DEFAULT_SETTINGS } from "src/settings/settings";
import type { MappingInfo } from "src/editor_extensions/conceal_fns";
import { createRevealCallback, type Conceal, type Concealment } from "src/editor_extensions/conceal";
import { EMPTY_SETTINGS } from "src/settings/empty_settings";
import type { Debouncer } from "src/editor_extensions/obsidian_utils";
import { fullMappingSchema } from "src/editor_extensions/conceal_maps";

export const latexSuiteConfig = Facet.define<LatexSuiteCMSettings, LatexSuiteCMSettings>({
    combine: (input) => {
        const settings = input[0] ?? processLatexSuiteSettings(DEFAULT_SETTINGS, {
			snippets: [],
			snippetVariables: {},
			rawConcealMaps: [],
			updateHandlers: [],	
		});
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

export type ConcealConfigInput = {
	concealRevealTimeout: number;
	concealLinewise: boolean;
	concealMaps: MappingInfo;
}

type ConcealConfig = {
	delayedReveal: Debouncer<[Conceal, Concealment[], EditorView], void>;
	concealLinewise: boolean;
	concealMaps: MappingInfo;
}

export const concealConfig = Facet.define<ConcealConfigInput, ConcealConfig>({
	combine: (input) => {
		const settings = input[0] ?? {
			concealRevealTimeout: EMPTY_SETTINGS.concealRevealTimeout,
			concealLinewise: EMPTY_SETTINGS.concealLinewise,
			concealMaps: { macroMap: {}, maps: fullMappingSchema([]) } satisfies MappingInfo,
		};
		const concealRevealTimeout = createRevealCallback(
			settings.concealRevealTimeout,
		);
		return {
			...settings,
			delayedReveal: concealRevealTimeout,
		};
	},
});

export function getConcealConfig(state: EditorState) {
    return state.facet(concealConfig);
}

export function getConcealConfigExtension(pluginSettings: ConcealConfigInput) {
    return concealConfig.of(pluginSettings);
}
