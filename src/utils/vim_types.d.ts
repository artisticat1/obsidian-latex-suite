import { EditorSelection, ChangeDesc, Extension } from "@codemirror/state";
import { StringStream } from "@codemirror/language";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { SearchQuery } from "@codemirror/search";

type VimState = {
    onPasteFn?: any;
    sel: { head: Pos$1; anchor: Pos$1 };
    insertModeReturn: boolean;
    visualBlock: boolean;
    marks: { [mark: string]: Marker$1 };
    visualMode: boolean;
    insertMode: boolean;
    pasteFn: any;
    lastSelection: any;
    searchState_: any;
    lastEditActionCommand: actionCommand | void;
    lastPastedText: any;
    lastMotion: any;
    options: { [optionName: string]: vimOption };
    lastEditInputState: InputStateInterface | void;
    inputState: InputStateInterface;
    visualLine: boolean;
    insertModeRepeat: any;
    lastHSPos: number;
    lastHPos: number;
    wasInVisualBlock?: boolean;
    insert?: any;
    insertEnd?: Marker$1;
    status: string;
    exMode?: boolean;
    mode?: any;
    expectLiteralNext?: boolean;
    constructor(): void;
};
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
    lastSel?: any;
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

type optionCallback = (value?: string | undefined, cm?: CodeMirror) => any;
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
    motionRepeat: any[];
    operator: any | undefined | null;
    operatorArgs: OperatorArgs | undefined | null;
    motion: string | undefined | null;
    motionArgs: MotionArgs | null;
    keyBuffer: any[];
    registerName?: string;
    changeQueue: any;
    operatorShortcut?: string;
    selectedCharacter?: string;
    repeatOverride?: number;
    changeQueueList?: any[];
    pushRepeatDigit(n: string): void;
    getRepeat(): number;
}

declare global {
    function isNaN(v: any): v is Exclude<typeof v, number>;
    interface String {
        trimStart(): string;
    }
}

declare class Pos {
    line: number;
    ch: number;
    sticky?: string;
    constructor(line: number, ch: number);
}
declare function on(emitter: any, type: string, f: Function): void;
declare function off(emitter: any, type: string, f: Function): void;
declare function signal(emitter: any, type: string, ...args: any[]): void;
interface Operation {
    $d: number;
    isVimOp?: boolean;
    cursorActivityHandlers?: Function[];
    cursorActivity?: boolean;
    lastChange?: any;
    change?: any;
    changeHandlers?: Function[];
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
        newlineAndIndentContinueComment: any;
        save: any;
    };
    static isWordChar: (ch: string) => boolean;
    static keys: any;
    static addClass: (el: any, str: any) => void;
    static rmClass: (el: any, str: any) => void;
    static e_preventDefault: (e: Event) => void;
    static e_stop: (e: Event) => void;
    static lookupKey: (key: string, map: string, handle: Function) => void;
    static on: typeof on;
    static off: typeof off;
    static signal: typeof signal;
    openDialog(
        template: Element,
        callback: Function,
        options: any
    ): (newVal?: string | undefined) => void;
    openNotification(template: Node, options: NotificationOptions): () => void;
    static findMatchingTag: typeof findMatchingTag;
    static findEnclosingTag: typeof findEnclosingTag;
    cm6: EditorView;
    state: {
        statusbar?: Element | null;
        dialog?: Element | null;
        vimPlugin?: any;
        vim?: VimState | null;
        currentNotificationClose?: Function | null;
        keyMap?: string;
        overwrite?: boolean;
        textwidth?: number;
    };
    marks: Record<string, Marker>;
    $mid: number;
    curOp: Operation | null | undefined;
    options: any;
    _handlers: any;
    constructor(cm6: EditorView);
    on(type: string, f: Function): void;
    off(type: string, f: Function): void;
    signal(type: string, e: any, handlers?: any): void;
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
    setSelection(anchor: Pos, head: Pos, options?: any): void;
    getLine(row: number): string;
    getLineHandle(row: number): {
        row: number;
        index: number;
    };
    getLineNumber(handle: any): number | null;
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
        _options?: any
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
        style: any,
        config: any
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
    removeOverlay(overlay?: any): void;
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
    operation(fn: Function, force?: boolean): any;
    onBeforeEndOperation(): void;
    moveH(increment: number, unit: string): void;
    setOption(name: string, val: any): void;
    getOption(name: "firstLineNumber" | "tabSize"): number;
    getOption(name: string): number | boolean | string | undefined;
    toggleOverwrite(on: boolean): void;
    getTokenTypeAt(pos: Pos): "" | "string" | "comment";
    overWriteSelection(text: string): void;
    /*** multiselect ****/
    isInMultiSelectMode(): boolean;
    virtualSelectionMode(): boolean;
    virtualSelection: Mutable<EditorSelection> | null;
    forEachSelection(command: Function): void;
    hardWrap(options: any): number;
    showMatchesOnScrollbar?: Function;
    save?: Function;
    static keyName?: Function;
}
declare type Mutable<Type> = {
    -readonly [Key in keyof Type]: Type[Key];
};
interface NotificationOptions {
    bottom?: boolean;
    duration?: number;
}
declare function findMatchingTag(cm: CodeMirror, pos: Pos): undefined;
declare function findEnclosingTag(
    cm: CodeMirror,
    pos: Pos
):
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
    defineEx(name: string, prefix: string, func: Function): void;
    defineMotion(name: string, fn: Function): void;
    defineOperator(name: string, fn: Function): void;
    defineAction(name: string, fn: Function): void;
    defineOption(
        name: string,
        defaultValue: any,
        type: string,
        aliases?: string[],
        callback?: Function
    ): void;
    defineRegister(name: string, register: any): void;
    enterInsertMode(cm: CodeMirror): void;
    enterVimMode(cm: CodeMirror): void;
    exitInsertMode(cm: CodeMirror, keepCursor?: boolean): void;
    exitVisualMode(cm: CodeMirror, moveHead?: boolean): void;
    findKey(cm: CodeMirror, key: string, origin?: string): boolean;
    getOption(name: string, cm: CodeMirror, cfg?: any): any;
    getRegisterController(): any;
    getVimGlobalState_(): any;
    handleEx(cm: CodeMirror, input: string): void;
    handleKey(cm: CodeMirror, key: string, origin?: string): boolean;
    langmap(langmapString: string, remapCtrl: boolean): void;
    leaveVimMode(cm: CodeMirror): void;
    map(lhs: string, rhs: string, ctx?: { buffer?: boolean }): void;
    mapCommand(keys: string, type: string, name: string, args?: any, extra?: any): void;
    mapclear(ctx?: { buffer?: boolean }): void;
    maybeInitVimState_(cm: CodeMirror): VimState;
    multiSelectHandleKey(cm: CodeMirror, key: string, origin?: string): boolean;
    noremap(lhs: string, rhs: string, ctx?: { buffer?: boolean }): void;
    resetVimGlobalState_(): void;
    setOption(name: string, value: any, cm: CodeMirror, cfg?: object): void;
    suppressErrorLogging: boolean;
    unmap(lhs: string, ctx: string): void;
    vimKeyFromEvent(event: KeyboardEvent, vim: any): string;
    _mapCommand(command: any): void;
}

export { Vim, CodeMirror as CodeMirrorEditor, VimState };
