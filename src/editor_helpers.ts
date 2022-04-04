import { Text } from "@codemirror/text";
import { Editor, EditorPosition, EditorSelection } from "obsidian";
import { Environment } from "./snippets";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { syntaxTree } from "@codemirror/language";
import { Tree } from "@lezer/common";


export function isWithinMath(pos: number, editor: Editor):boolean {
    let tree: Tree = null;
    const state = editorToCodeMirrorState(editor);
    if (!tree) tree = syntaxTree(state);

    const token = tree.resolveInner(pos, 1).type.name;

    let withinMath = (token && token.contains("math"));

    // Check whether within "\text{}"
    if (withinMath) {
        withinMath = !(isInsideEnvironment(editor, pos+1, {openSymbol: "\\text{", closeSymbol: "}"}));
    }

    return withinMath;
}



export function isInsideEnvironment(editor: Editor, pos: number, env: Environment):boolean {
    const result = getEquationBounds(editor, pos);
    if (!result) return false;
    const {start, end} = result;
    const text = editor.getValue();
    const {openSymbol, closeSymbol} = env;

    // Restrict our search to the equation we're currently in
    const curText = text.slice(start, end);

    const openBracket = openSymbol.slice(-1);
    const closeBracket = getCloseBracket(openBracket);


    // Take care when the open symbol ends with a bracket {, [, or (
    // as then the closing symbol, }, ] or ), is not unique to this open symbol
    let offset;
    let openSearchSymbol;

    if (["{", "[", "("].contains(openBracket) && closeSymbol === closeBracket) {
        offset = openSymbol.length - 1;
        openSearchSymbol = openBracket;
    }
    else {
        offset = 0;
        openSearchSymbol = openSymbol;
    }


    let left = curText.lastIndexOf(openSymbol, pos - start - 1);

    while (left != -1) {
        const right = findMatchingBracket(curText, left + offset, openSearchSymbol, closeSymbol, false);

        if (right === -1) return false;

        // Check whether the cursor lies inside the environment symbols
        if ((right >= pos - start) && (pos - start >= left + openSymbol.length)) {
            return true;
        }

        // Find the next open symbol
        left = curText.lastIndexOf(openSymbol, left - 1);
    }

    return false;
}


export function posFromIndex(doc: Text, offset: number): EditorPosition {
    const line = doc.lineAt(offset)
    return {line: line.number - 1, ch: offset - line.from}
}

export function indexFromPos(doc: Text, pos: EditorPosition): number {
    const ch = pos.ch;
    const line = doc.line(pos.line + 1);
    return Math.min(line.from + Math.max(0, ch), line.to)
}

export function editorToCodeMirrorState(editor: Editor): EditorState {
    return (editor as any).cm.state;
}

export function editorToCodeMirrorView(editor: Editor): EditorView {
    return (editor as any).cm;
}

export function reverse(s: string){
    return s.split("").reverse().join("");
}

export function findMatchingBracket(text: string, start: number, openBracket: string, closeBracket: string, searchBackwards: boolean):number {
    if (searchBackwards) {
        const reversedIndex = findMatchingBracket(reverse(text), text.length - (start + closeBracket.length), reverse(closeBracket), reverse(openBracket), false);

        if (reversedIndex === -1) return -1;

        return text.length - (reversedIndex + openBracket.length)
    }

    let brackets = 0;

    for (let i = start; i < text.length; i++) {
        if (text.slice(i, i + openBracket.length) === openBracket) {
            brackets++;
        }
        else if (text.slice(i, i + closeBracket.length) === closeBracket) {
            brackets--;

            if (brackets === 0) {
                return i;
            }
        }
    }

    return -1;
}


export function getOpenBracket(closeBracket: string) {
    const openBrackets:{[closeBracket: string]: string} = {")": "(", "]": "[", "}": "{"};

    return openBrackets[closeBracket];
}


export function getCloseBracket(openBracket: string) {
    const closeBrackets:{[openBracket: string]: string} = {"(": ")", "[": "]", "{": "}"};

    return closeBrackets[openBracket];
}


export function orientAnchorHead(selection: EditorSelection):EditorSelection {
    let {anchor, head} = selection;

    // Account for a selection beginning from either end
    if ((anchor.line === head.line && anchor.ch > head.ch) || (anchor.line > head.line)) {
        // Swap anchor and head
        const temp = anchor;
        anchor = head;
        head = temp;
    }

    return {anchor: anchor, head: head}
}


export function getEquationBounds(editor: Editor, pos: number):{start: number, end: number} {
    const text = editor.getValue();

    const left = text.lastIndexOf("$", pos-1);
    const right = text.indexOf("$", pos);

    if (left === -1 || right === -1) return;


    return {start: left, end: right};
}