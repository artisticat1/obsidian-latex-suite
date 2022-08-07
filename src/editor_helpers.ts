import { Platform } from "obsidian";
import { Environment } from "./snippets";
import { EditorView } from "@codemirror/view";
import { EditorSelection, SelectionRange } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";


export function replaceRange(view: EditorView, start: number, end: number, replacement: string) {
    view.dispatch({
        changes: {from: start, to: end, insert: replacement}
    });
}


export function setCursor(view: EditorView, pos: number) {
    view.dispatch({
        selection: {anchor: pos, head: pos}
    });

    resetCursorBlink();
}


export function setSelection(view: EditorView, start: number, end: number) {
    view.dispatch({
        selection: {anchor: start, head: end}
    });

    resetCursorBlink();
}


export function setSelections(view: EditorView, ranges: SelectionRange[]) {
    view.dispatch({
        selection: EditorSelection.create(ranges)
    });

    resetCursorBlink();
}



export function resetCursorBlink() {
    if (Platform.isMobile) return;

    const cursorLayer = document.getElementsByClassName("cm-cursorLayer")[0] as HTMLElement;
    const curAnim = cursorLayer.style.animationName;

    cursorLayer.style.animationName = curAnim === "cm-blink" ? "cm-blink2" : "cm-blink";
}


export function isWithinEquation(view: EditorView):boolean {
    const pos = view.state.selection.main.to - 1;
    const tree = syntaxTree(view.state);

    const token = tree.resolveInner(pos, 1).name;
    let withinEquation = token.contains("math");

    if (!withinEquation) {
        // Allows detection of math mode at beginning of a line

        const tokenLeft = tree.resolveInner(pos - 1, 1).name;
        const tokenRight = tree.resolveInner(pos + 1, 1).name;

        if (tokenLeft.contains("math") && tokenRight.contains("math")) {
            withinEquation = true;
        }
    }
    else {
        if (token.contains("end")) {
            withinEquation = false;
        }
    }


    return withinEquation;
}


export function isWithinInlineEquation(view: EditorView):boolean {
    const result = getEquationBounds(view);
    if (!result) return false;
    const end = result.end;

    const d = view.state.doc;

    // Check whether we're in inline math or a block eqn
    const inlineMath = d.sliceString(end, end+2) != "$$";

    return inlineMath;
}


export function getEquationBounds(view: EditorView, pos?: number):{start: number, end: number} {
    const text = view.state.doc.toString();
    if (typeof pos === "undefined") {
        pos = view.state.selection.main.from;
    }

    const left = text.lastIndexOf("$", pos-1);
    const right = text.indexOf("$", pos);

    if (left === -1 || right === -1) return;


    return {start: left + 1, end: right};
}



export function isInsideEnvironment(view: EditorView, pos: number, env: Environment):boolean {
    const result = getEquationBounds(view);
    if (!result) return false;
    const {start, end} = result;
    const text = view.state.doc.toString();
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

        if (left <= 0) return false;

        // Find the next open symbol
        left = curText.lastIndexOf(openSymbol, left - 1);
    }

    return false;
}



export function reverse(s: string){
    return s.split("").reverse().join("");
}


export function findMatchingBracket(text: string, start: number, openBracket: string, closeBracket: string, searchBackwards: boolean, end?: number):number {
    if (searchBackwards) {
        const reversedIndex = findMatchingBracket(reverse(text), text.length - (start + closeBracket.length), reverse(closeBracket), reverse(openBracket), false);

        if (reversedIndex === -1) return -1;

        return text.length - (reversedIndex + openBracket.length)
    }

    let brackets = 0;
    const stop = end ? end : text.length;

    for (let i = start; i < stop; i++) {
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
    const closeBrackets:{[openBracket: string]: string} = {"(": ")", "[": "]", "{": "}", "\\{": "\\}"};

    return closeBrackets[openBracket];
}

