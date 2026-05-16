/**
 * Rough type definitions of vim apis, only use public apis that are documented in codemirror5 documentation.
 */
import { EditorSelection, ChangeDesc } from "@codemirror/state";
import { StringStream } from "@codemirror/language";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { SearchQuery } from "@codemirror/search";

type unknownFunction = (...args: unknown[]) => unknown;
declare class VimState {
    onPasteFn?: unknown;
    sel: { head: Pos$1; anchor: Pos$1 };
    insertModeReturn: boolean;
    visualBlock: boolean;
    marks: { [mark: string]: Marker$1 };
    visualMode: boolean;
    insertMode: boolean;
    pasteFn: unknown;
    lastSelection: unknown;
    searchState_: unknown;
    lastEditActionCommand: actionCommand | void;
    lastPastedText: unknown;
    lastMotion: unknown;
    options: { [optionName: string]: vimOption };
    lastEditInputState: InputStateInterface | void;
    inputState: InputStateInterface;
    visualLine: boolean;
    insertModeRepeat: unknown;
    lastHSPos: number;
    lastHPos: number;
    wasInVisualBlock?: boolean;
    insert?: unknown;
    insertEnd?: Marker$1;
    status: string;
    exMode?: boolean;
    mode?: unknown;
    expectLiteralNext?: boolean;
}

type Marker$1 = ReturnType<CodeMirror["setBookmark"]>;
type Pos$1 = { line: number; ch: number; sticky?: string };
interface CM5RangeInterface {
    anchor: Pos$1;
    head: Pos$1;
}

type OperatorArgs = {
    repeat?: number;
    forward?: boolean;
    linewise?: boolean;
    fullLine?: boolean;
    registerName?: string | null;
    indentRight?: boolean;
    toLower?: boolean;
    shouldMoveCursor?: boolean;
    selectedCharacter?: string;
    lastSel?: unknown;
    keepCursor?: boolean;
};

type ActionArgsPartial = {
    repeat?: number;
    forward?: boolean;
    head?: Pos$1;
    position?: string;
    backtrack?: boolean;
    increase?: boolean;
    repeatIsExplicit?: boolean;
    indentRight?: boolean;
    selectedCharacter?: string;
    after?: boolean;
    matchIndent?: boolean;
    registerName?: string;
    isEdit?: boolean;
    linewise?: boolean;
    insertAt?: string;
    blockwise?: boolean;
    keepSpaces?: boolean;
    replace?: boolean;
    keepCursor?: boolean;
};

type MotionArgsPartial = {
    repeat?: number;
    forward?: boolean;
    selectedCharacter?: string;
    linewise?: boolean;
    textObjectInner?: boolean;
    sameLine?: boolean;
    repeatOffset?: number;
    toJumplist?: boolean;
    inclusive?: boolean;
    wordEnd?: boolean;
    toFirstChar?: boolean;
    explicitRepeat?: boolean;
    bigWord?: boolean;
    repeatIsExplicit?: boolean;
    noRepeat?: boolean;
};

type MotionArgs = MotionArgsPartial & { repeat: number };

type optionCallback = (value?: string, cm?: CodeMirror) => unknown;
type vimOption = {
    type?: string;
    defaultValue?: unknown;
    callback?: optionCallback;
    value?: unknown;
};

type allCommands = {
    keys: string;
    context?: string;
    interlaceInsertRepeat?: boolean;
    exitVisualBlock?: boolean;
    isEdit?: boolean;
    repeatOverride?: number;
};
type actionCommand = allCommands & {
    type: "action";
    action: string;
    actionArgs?: ActionArgsPartial;
    motion?: string;
    operator?: string;
    interlaceInsertRepeat?: boolean;
};

interface InputStateInterface {
    prefixRepeat: string[];
    motionRepeat: unknown[];
    operator: unknown;
    operatorArgs: OperatorArgs | undefined | null;
    motion: string | undefined | null;
    motionArgs: MotionArgs | null;
    keyBuffer: unknown[];
    registerName?: string;
    changeQueue: unknown;
    operatorShortcut?: string;
    selectedCharacter?: string;
    repeatOverride?: number;
    changeQueueList?: unknown[];
    pushRepeatDigit(n: string): void;
    getRepeat(): number;
}

declare class Pos {
    line: number;
    ch: number;
    sticky?: string;
    constructor(line: number, ch: number);
}

type on = (emitter: unknown, type: string, f: unknownFunction) => void;
type off = (emitter: unknown, type: string, f: unknownFunction) => void;
type signal = (emitter: unknown, type: string, ...args: unknown[]) => void;
interface Operation {
    $d: number;
    isVimOp?: boolean;
    cursorActivityHandlers?: unknownFunction[];
    cursorActivity?: boolean;
    lastChange?: unknown;
    change?: unknown;
    changeHandlers?: unknownFunction[];
    $changeStart?: number;
}
declare class CodeMirror {
    static isMac: boolean;
    static Pos: typeof Pos;
    static StringStream: StringStream & (new (_: string) => StringStream);
    static commands: {
        cursorCharLeft: (cm: CodeMirror) => void;
        redo: (cm: CodeMirror) => void;
        undo: (cm: CodeMirror) => void;
        newlineAndIndent: (cm: CodeMirror) => void;
        indentAuto: (cm: CodeMirror) => void;
        newlineAndIndentContinueComment: unknown;
        save: unknown;
    };
    static isWordChar: (ch: string) => boolean;
    static keys: unknown;
    static addClass: (el: unknown, str: unknown) => void;
    static rmClass: (el: unknown, str: unknown) => void;
    static e_preventDefault: (e: Event) => void;
    static e_stop: (e: Event) => void;
    static lookupKey: (key: string, map: string, handle: unknownFunction) => void;
    static on: on;
    static off: off;
    static signal: signal;
    openDialog(
        template: Element,
        callback: unknownFunction,
        options: unknown
    ): (newVal?: string) => void;
    openNotification(template: Node, options: NotificationOptions): () => void;
    static findMatchingTag: findMatchingTag;
    static findEnclosingTag: findEnclosingTag;
    cm6: EditorView;
    state: {
        statusbar?: Element | null;
        dialog?: Element | null;
        vimPlugin?: unknown;
        vim?: VimState | null;
        currentNotificationClose?: unknownFunction | null;
        keyMap?: string;
        overwrite?: boolean;
        textwidth?: number;
    };
    marks: Record<string, Marker>;
    $mid: number;
    curOp: Operation | null | undefined;
    options: unknown;
    _handlers: unknown;
    constructor(cm6: EditorView);
    on(type: string, f: unknownFunction): void;
    off(type: string, f: unknownFunction): void;
    signal(type: string, e: unknown, handlers?: unknown): void;
    indexFromPos(pos: Pos): number;
    posFromIndex(offset: number): Pos;
    foldCode(pos: Pos): void;
    firstLine(): number;
    lastLine(): number;
    lineCount(): number;
    setCursor(line: number, ch: number): void;
    setCursor(line: Pos): void;
    getCursor(p?: "head" | "anchor" | "start" | "end"): Pos;
    listSelections(): {
        anchor: Pos;
        head: Pos;
    }[];
    setSelections(p: CM5RangeInterface[], primIndex?: number): void;
    setSelection(anchor: Pos, head: Pos, options?: unknown): void;
    getLine(row: number): string;
    getLineHandle(row: number): {
        row: number;
        index: number;
    };
    getLineNumber(handle: unknown): number | null;
    releaseLineHandles(): void;
    getRange(s: Pos, e: Pos): string;
    replaceRange(text: string, s: Pos, e?: Pos, source?: string): void;
    replaceSelection(text: string): void;
    replaceSelections(replacements: string[]): void;
    getSelection(): string;
    getSelections(): string[];
    somethingSelected(): boolean;
    getInputField(): HTMLElement;
    clipPos(p: Pos): Pos;
    getValue(): string;
    setValue(text: string): void;
    focus(): void;
    blur(): void;
    defaultTextHeight(): number;
    findMatchingBracket(
        pos: Pos,
        _options?: unknown
    ):
        | {
              to: Pos;
          }
        | {
              to: undefined;
          };
    scanForBracket(
        pos: Pos,
        dir: 1 | -1,
        style: unknown,
        config: unknown
    ):
        | false
        | {
              pos: Pos;
              ch: string;
          }
        | null;
    indentLine(line: number, more?: boolean): void;
    indentMore(): void;
    indentLess(): void;
    execCommand(name: string): void;
    setBookmark(
        cursor: Pos,
        options?: {
            insertLeft: boolean;
        }
    ): Marker;
    cm6Query?: SearchQuery;
    addOverlay({ query }: { query: RegExp }): SearchQuery | undefined;
    removeOverlay(overlay?: unknown): void;
    getSearchCursor(
        query: RegExp,
        pos: Pos
    ): {
        findNext: () => string[] | null | undefined;
        findPrevious: () => string[] | null | undefined;
        find: (back?: boolean) => string[] | null | undefined;
        from: () => Pos | undefined;
        to: () => Pos | undefined;
        replace: (text: string) => void;
    };
    findPosV(
        start: Pos,
        amount: number,
        unit: "page" | "line",
        goalColumn?: number
    ): Pos & {
        hitSide?: boolean | undefined;
    };
    charCoords(
        pos: Pos,
        mode: "div" | "local"
    ): {
        left: number;
        top: number;
        bottom: number;
    };
    coordsChar(
        coords: {
            left: number;
            top: number;
        },
        mode: "div" | "local"
    ): Pos;
    getScrollInfo(): {
        left: number;
        top: number;
        height: number;
        width: number;
        clientHeight: number;
        clientWidth: number;
    };
    scrollTo(x?: number | null, y?: number | null): void;
    scrollIntoView(pos?: Pos, margin?: number): void;
    getWrapperElement(): HTMLElement;
    getMode(): {
        name: string | number | boolean | undefined;
    };
    setSize(w: number, h: number): void;
    refresh(): void;
    destroy(): void;
    getLastEditEnd(): Pos;
    $lastChangeEndOffset: number;
    $lineHandleChanges: undefined | ViewUpdate[];
    onChange(update: ViewUpdate): void;
    onSelectionChange(): void;
    operation(fn: unknownFunction, force?: boolean): unknown;
    onBeforeEndOperation(): void;
    moveH(increment: number, unit: string): void;
    setOption(name: string, val: unknown): void;
    getOption(name: "firstLineNumber" | "tabSize"): number;
    getOption(name: string): number | boolean | string | undefined;
    toggleOverwrite(on: boolean): void;
    getTokenTypeAt(pos: Pos): "" | "string" | "comment";
    overWriteSelection(text: string): void;
    /*** multiselect ****/
    isInMultiSelectMode(): boolean;
    virtualSelectionMode(): boolean;
    virtualSelection: Mutable<EditorSelection> | null;
    forEachSelection(command: unknownFunction): void;
    hardWrap(options: unknown): number;
    showMatchesOnScrollbar?: unknownFunction;
    save?: unknownFunction;
    static keyName?: unknownFunction;
}
declare type Mutable<Type> = {
    -readonly [Key in keyof Type]: Type[Key];
};
interface NotificationOptions {
    bottom?: boolean;
    duration?: number;
}
type findMatchingTag = (cm: CodeMirror, pos: Pos) => undefined;
type findEnclosingTag = (
    cm: CodeMirror,
    pos: Pos
) =>
    | {
          open: {
              from: Pos;
              to: Pos;
          };
          close: {
              from: Pos;
              to: Pos;
          };
      }
    | undefined;
declare class Marker {
    cm: CodeMirror;
    id: number;
    offset: number | null;
    assoc: number;
    constructor(cm: CodeMirror, offset: number, assoc: number);
    clear(): void;
    find(): Pos | null;
    update(change: ChangeDesc): void;
}
declare interface Vim {
    defineEx(name: string, prefix: string, func: unknownFunction): void;
    defineMotion(name: string, fn: unknownFunction): void;
    defineOperator(name: string, fn: unknownFunction): void;
    defineAction(name: string, fn: unknownFunction): void;
    defineOption(
        name: string,
        defaultValue: unknown,
        type: string,
        aliases?: string[],
        callback?: unknownFunction
    ): void;
    defineRegister(name: string, register: unknown): void;
    enterInsertMode(cm: CodeMirror): void;
    enterVimMode(cm: CodeMirror): void;
    exitInsertMode(cm: CodeMirror, keepCursor?: boolean): void;
    exitVisualMode(cm: CodeMirror, moveHead?: boolean): void;
    findKey(cm: CodeMirror, key: string, origin?: string): boolean;
    getOption(name: string, cm: CodeMirror, cfg?: unknown): unknown;
    getRegisterController(): unknown;
    getVimGlobalState_(): unknown;
    handleEx(cm: CodeMirror, input: string): void;
    handleKey(cm: CodeMirror, key: string, origin?: string): boolean;
    langmap(langmapString: string, remapCtrl: boolean): void;
    leaveVimMode(cm: CodeMirror): void;
    map(lhs: string, rhs: string, ctx?: { buffer?: boolean }): void;
    mapCommand(keys: string, type: string, name: string, args?: unknown, extra?: unknown): void;
    mapclear(ctx?: { buffer?: boolean }): void;
    maybeInitVimState_(cm: CodeMirror): VimState;
    multiSelectHandleKey(cm: CodeMirror, key: string, origin?: string): boolean;
    noremap(lhs: string, rhs: string, ctx?: { buffer?: boolean }): void;
    resetVimGlobalState_(): void;
    setOption(name: string, value: unknown, cm: CodeMirror, cfg?: object): void;
    suppressErrorLogging: boolean;
    unmap(lhs: string, ctx: string): void;
    vimKeyFromEvent(event: KeyboardEvent, vim: unknown): string;
    _mapCommand(command: unknown): void;
}

export { Vim, CodeMirror as CodeMirrorEditor, VimState };
