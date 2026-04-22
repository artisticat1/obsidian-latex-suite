import { SelectionRange, Extension } from '@codemirror/state';
import { Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';

declare class Options {
    mode: Mode;
    automatic: boolean;
    regex: boolean;
    onWordBoundary: boolean;
    visual: boolean;
    constructor();
    static fromSource(source: string, language: string | undefined): Options;
}
declare class Mode {
    text: boolean;
    inlineMath: boolean;
    blockMath: boolean;
    codeMath: boolean;
    code: string | boolean;
    textEnv: boolean;
    /**
     * Whether the state is inside an equation bounded by $ or $$ delimeters.
     */
    inEquation(): boolean;
    /**
     * Whether the state is in any math mode.
     *
     * The equation may be bounded by $ or $$ delimeters, or it may be an equation inside a `math` codeblock.
     */
    inMath(): boolean;
    /**
     * Whether the state is strictly in math mode.
     *
     * Returns false when the state is within math, but inside a text environment, such as \text{}.
     */
    strictlyInMath(): boolean;
    constructor();
    invert(): void;
    static fromSource(source: string, language: string | undefined): Mode;
}

/**
 * defines a math environment, where semantics for snippets may change from how they'd usually behave in math mode
 */
interface Environment {
    openSymbol: string;
    closeSymbol: string;
}

/**
 * there are 3 distinct types of snippets:
 *
 * `visual` snippets only trigger on text selections.
 * visual snippets support only (single-character) string triggers, and string or function replacements.
 * visual replacement functions take in the text selection and return a string, or `false` to indicate to actually not do anything.
 *
 * `regex` snippets support string (with the "r" raw option set) or regex triggers, and string or function replacements.
 * regex replacement functions take in the regex match and return a string.
 *
 * `string` snippets support string triggers (when no "r" raw option set), and string or function replacements.
 * string replacement functions take in the matched string and return a string.
 */
type SnippetType = "visual" | "regex" | "string";
type SnippetData<T extends SnippetType> = {
    visual: {
        trigger: string;
        replacement: string | ((selection: string) => string | false);
    };
    regex: {
        trigger: RegExp;
        replacement: string | ((match: RegExpExecArray) => string);
    };
    string: {
        trigger: string;
        replacement: string | ((match: string) => string);
    };
}[T];
type ProcessSnippetResult = {
    triggerPos: number;
    replacement: string;
} | null;
/**
 * a snippet instance contains all the information necessary to run a snippet.
 * snippet data specific to a certain type of snippet is in its `data` property.
 */
declare abstract class Snippet<T extends SnippetType = SnippetType> {
    type: T;
    data: SnippetData<T>;
    options: Options;
    priority: number;
    description: string;
    triggerKey: string;
    excludedEnvironments: Environment[];
    constructor(type: T, trigger: SnippetData<T>["trigger"], replacement: SnippetData<T>["replacement"], options: Options, priority?: number, description?: string, excludedEnvironments?: Environment[], triggerKey?: string);
    get trigger(): SnippetData<T>["trigger"];
    get replacement(): SnippetData<T>["replacement"];
    abstract process(effectiveLine: string, range: SelectionRange, sel: string): ProcessSnippetResult;
    toString(): string;
}

type snippetDebugLevel = "off" | "info" | "verbose";
type CMKeyMap = string;
type VimKeyMap = string;
interface LatexSuiteBasicSettings {
    snippetsEnabled: boolean;
    suppressSnippetTriggerOnIME: boolean;
    suppressIMEWarning: boolean;
    removeSnippetWhitespace: boolean;
    autoDelete$: boolean;
    loadSnippetsFromFile: boolean;
    loadSnippetVariablesFromFile: boolean;
    snippetsFileLocation: string;
    snippetVariablesFileLocation: string;
    autofractionEnabled: boolean;
    concealEnabled: boolean;
    concealRevealTimeout: number;
    colorPairedBracketsEnabled: boolean;
    highlightCursorBracketsEnabled: boolean;
    mathPreviewEnabled: boolean;
    mathPreviewPositionIsAbove: boolean;
    mathPreviewCursor: string;
    mathPreviewBracketHighlighting: boolean;
    autofractionSymbol: string;
    autofractionBreakingChars: string;
    matrixShortcutsEnabled: boolean;
    taboutEnabled: boolean;
    autoEnlargeBrackets: boolean;
    wordDelimiters: string;
    snippetDebug: snippetDebugLevel;
    vimEnabled: boolean;
    vimSelectMode: VimKeyMap;
    vimVisualMode: VimKeyMap;
    vimMatrixEnter: VimKeyMap;
    snippetRecursion: number;
    snippetIMEVersion: boolean;
}
/** triggers following the same format as https://codemirror.net/docs/ref/#view.KeyBinding */
interface LatexSuiteCMKeymapSettings {
    snippetsTrigger: CMKeyMap;
    snippetNextTabstopTrigger: CMKeyMap;
    snippetPreviousTabstopTrigger: CMKeyMap;
    taboutTrigger: CMKeyMap;
}
/**
 * Settings that require further processing (e.g. conversion to an array) before being used.
 */
interface LatexSuiteRawSettings {
    autofractionExcludedEnvs: string;
    matrixShortcutsEnvNames: string;
    taboutClosingSymbols: string;
    autoEnlargeBracketsTriggers: string;
    forceMathLanguages: string;
}
interface LatexSuiteParsedSettings {
    autofractionExcludedEnvs: Environment[];
    matrixShortcutsEnvNames: string[];
    taboutClosingSymbols: Set<string>;
    autoEnlargeBracketsTriggers: string[];
    forceMathLanguages: string[];
}
type LatexSuitePluginSettings = {
    snippets: string;
    snippetVariables: string;
} & LatexSuiteBasicSettings & LatexSuiteRawSettings & LatexSuiteCMKeymapSettings;
type LatexSuiteCMSettings = {
    snippets: Snippet[];
} & LatexSuiteBasicSettings & LatexSuiteParsedSettings & LatexSuiteCMKeymapSettings;

type SnippetVariables = Record<string, string>;

declare class LatexSuitePlugin extends Plugin {
    settings: LatexSuitePluginSettings;
    CMSettings: LatexSuiteCMSettings;
    editorExtensions: Extension[];
    disableMath: (view: EditorView) => void;
    onload(): Promise<void>;
    onunload(): void;
    legacyEditorWarning(): void;
    IMEEditorWarning(): void;
    loadSettings(): Promise<void>;
    saveSettings(didFileLocationChange?: boolean): Promise<void>;
    getSettingsSnippetVariables(): Promise<SnippetVariables>;
    getSettingsSnippets(snippetVariables: SnippetVariables): Promise<Snippet<SnippetType>[]>;
    getSnippets(becauseFileLocationUpdated: boolean, becauseFileUpdated: boolean): Promise<Snippet<SnippetType>[]>;
    processSettings(becauseFileLocationUpdated?: boolean, becauseFileUpdated?: boolean): Promise<void>;
    setEditorExtensions(): void;
    showSnippetsLoadedNotice(nSnippets: number, nSnippetVariables: number, becauseFileLocationUpdated: boolean, becauseFileUpdated: boolean): void;
    addEditorCommands(): void;
    watchFiles(): void;
    loadIcons(): void;
}

export { LatexSuitePlugin as default };
