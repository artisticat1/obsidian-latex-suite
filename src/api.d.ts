import { AnnotationType, ChangeDesc, EditorSelection, EditorState, Extension, Range, SelectionRange, StateEffectType, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin } from "@codemirror/view";
import { Tree } from "@lezer/common";
import { Plugin } from "obsidian";

export type TabstopGroupSpec = {
	index: number,
	from: number,
	to: number
}
export interface TabstopSpec {
    index: number[],
    from: number,
    to: number,
}

export declare class TabstopGroup {
    decos: DecorationSet;
    color: number;
    hidden: boolean;
    constructor(tabstopSpecs: TabstopGroupSpec[], color: number)
    select(view: EditorView, selectEndpoints: boolean, isEndSnippet: boolean): void
    toSelectionRanges(): SelectionRange[] 
    toEditorSelection(endpoints: boolean): EditorSelection 
    containsSelection(selection: EditorSelection): boolean 
    hideFromEditor(): void 
    map(changes: ChangeDesc): void 
    getRanges(): Range<Decoration>[] 
	copy(): TabstopGroup
}

export type SnippetChangeSpecApi = {
	from: number,
	to: number,
	insert: {
		insert: string,
		tabstops:readonly TabstopSpec[]
	} | string | BaseNode[],
	keyPressed?: string,
	after?: number
}

declare class BaseNode {}

/**
 * @public
 * @since 1.12.0
 */
export interface LatexSuitePluginPublicApi extends Plugin{
	/**
	 * @public
	 * @since 1.0.0
	 */
	editorExtensions: Extension[];
	/**
	 * @public
	 * @since 1.12.0
	 */
	disableMath: (view: EditorView) => void;
	
	/**
	 * @public
	 * @since 1.13.0
	 */
	modifiedSyntaxTree: (state: EditorState) => Tree
	/**
	 * @public
	 * @since 1.13.0
	 */
	snippet: (view: EditorView, snippetChangeSpec: SnippetChangeSpecApi) => boolean,
	

	/**
	 * Mostly for internal use only. Use at your own discretion.
	 * @private
	 * @since 1.13.0
	 */
	api: {
		effects: {
			snippetInvertedEffects: Extension,
			startSnippet: StateEffectType<TabstopGroup[]>,
			endSnippet: StateEffectType<null>,
			undidStartSnippet: StateEffectType<TabstopGroup[]>,
			undidEndSnippet: StateEffectType<null>,
			LanguageSetStateEffect: StateEffectType<unknown>,
			addTabstopsEffect: StateEffectType<TabstopGroup[]>,
			removeAllTabstopsEffect: StateEffectType<null>,
			updateTooltipEffect: StateEffectType<unknown>,
		},
		fields: {
			cursorTooltipField: StateField<unknown>,
			notice: StateField<unknown>,
			languageStateField: StateField<unknown>,
			tabstopsStateField: StateField<unknown>,
		},
		annotations: {
			tempKeyPress: AnnotationType<true>,
		},
		plugin: {
			keyboardEventPlugin: ViewPlugin<PluginValue>,
			colorPairedBracketsPlugin: ViewPlugin<PluginValue>,
			highlightCursorBracketsPlugin: ViewPlugin<PluginValue>,
			parseWorker: ViewPlugin<PluginValue>,
			mathParserPlugin: ViewPlugin<PluginValue>,
			snippetQueuePlugin: ViewPlugin<PluginValue>,
			contextPlugin: ViewPlugin<PluginValue>,
			mathBoundsPlugin: ViewPlugin<PluginValue>,
		},
		shortcuts: {
			autoEnlargeBrackets: (view: EditorView) => boolean,
			runAutoFraction: (view: EditorView) => boolean,
			exitMatrixShortCut: (view: EditorView) => boolean,
			addCellMatrixShortcut: (view: EditorView) => boolean,
			newlineMatrixShortcut: (view: EditorView) => boolean,
			getVimRunMatrixEnterCommand: unknown,
			priorityTaboutMatrixShortcut: (view: EditorView) => boolean,
		},
		snippetApi: {
			tabstop_node: (index: number, insert?: string) => BaseNode,
			text_node: (text: string) => BaseNode,
			capture_node: (captureName: string | number, defaultValue: string) => BaseNode,
			snippet_node: (snippet: string) => BaseNode,
			array_node: unknown,
		}
	}
}
