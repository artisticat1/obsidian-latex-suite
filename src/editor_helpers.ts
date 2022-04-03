import {Text} from "@codemirror/text";
import {Editor, EditorPosition, EditorSelection} from "obsidian";
import {EditorState} from "@codemirror/state";
import {EditorView} from "@codemirror/view";

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