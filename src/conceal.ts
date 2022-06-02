// https://discuss.codemirror.net/t/concealing-syntax/3135

import { EditorView, ViewUpdate, Decoration, DecorationSet, WidgetType, ViewPlugin } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { Range } from "@codemirror/rangeset";
import { syntaxTree } from "@codemirror/language";
import { getEquationBounds, findMatchingBracket } from "./editor_helpers";
import { cmd_symbols, greek, map_super, map_sub, dot, hat, bar, brackets, mathbb, mathscrcal } from "./conceal_maps";


export interface Concealment {
    start: number,
    end: number,
    replacement: string,
    class?: string
}


class ConcealWidget extends WidgetType {
    private readonly className: string;

    constructor(readonly symbol: string, className?: string) {
        super();

        this.className = className ? className : "";
    }

    eq(other: ConcealWidget) {
        return (other.symbol == this.symbol)
    }

    toDOM() {
        const span = document.createElement("span")
        span.className = "cm-math " + this.className;
        span.textContent = this.symbol
        return span;
    }

    ignoreEvent() {
        return false
    }
}


function selectionAndRangeOverlap(selection: EditorSelection, rangeFrom:
    number, rangeTo: number) {

    for (const range of selection.ranges) {
        if ((range.from <= rangeTo) && (range.to) >= rangeFrom) {
            return true;
        }
    }

    return false;
}



function escapeRegex(regex: string) {
    const escapeChars = ["\\", "(", ")", "+", "-", "[", "]"];

    for (const escapeChar of escapeChars) {
        regex = regex.replaceAll(escapeChar, "\\" + escapeChar);
    }

    return regex;
}



function concealSymbols(eqn: string, prefix: string, suffix: string, symbolMap: {[key: string]: string}, className?: string):Concealment[] {
    const symbolNames = Object.keys(symbolMap);

    const regexStr = prefix + "(" + escapeRegex(symbolNames.join("|")) + ")" + suffix;
    const symbolRegex = new RegExp(regexStr, "g");


    const matches = [...eqn.matchAll(symbolRegex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const symbol = match[1];

        concealments.push({start: match.index, end: match.index + match[0].length, replacement: symbolMap[symbol], class: className});
    }

    return concealments;
}



function concealSupSub(eqn: string, superscript: boolean, symbolMap: {[key: string]:string}):Concealment[] {
    const symbolNames = Object.keys(symbolMap);

    const prefix = superscript ? "\\^" : "_";
    const regexStr = prefix + "{([" + escapeRegex(symbolNames.join("|")) + "]+)}";
    const regex = new RegExp(regexStr, "g");

    const matches = [...eqn.matchAll(regex)];


    const concealments:Concealment[] = [];

    for (const match of matches) {

        const exponent = match[1];
        let replacement = "";

        for (const letter of exponent.split("")) {
            replacement = replacement + symbolMap[letter];
        }

        concealments.push({start: match.index, end: match.index + match[0].length, replacement: replacement, class: "cm-number"});
    }

    return concealments;
}




function concealBoldMathBbMathRm(eqn: string, symbolMap: {[key: string]:string}):Concealment[] {

    const regexStr = "\\\\(mathbf|mathbb|mathrm){([A-Za-z0-9]+)}";
    const regex = new RegExp(regexStr, "g");

    const matches = [...eqn.matchAll(regex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const type = match[1];
        const value = match[2];

        const start = match.index;
        const end = start + match[0].length;

        if (type === "mathbf") {
            concealments.push({start: start, end: end, replacement: value, class: "cm-concealed-bold cm-variable-1"});
        }
        else if (type === "mathbb") {
            concealments.push({start: start, end: end, replacement: symbolMap[value]});
        }
        else {
            concealments.push({start: start, end: end, replacement: value, class: "cm-concealed-mathrm cm-variable-2"});
        }

    }

    return concealments;
}



function concealAtoZ(eqn: string, prefix: string, suffix: string, symbolMap: {[key: string]: string}, className?: string):Concealment[] {

    const regexStr = prefix + "([A-Z]+)" + suffix;
    const symbolRegex = new RegExp(regexStr, "g");


    const matches = [...eqn.matchAll(symbolRegex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const symbol = match[1];

        concealments.push({start: match.index, end: match.index + match[0].length, replacement: symbolMap[symbol], class: className});
    }

    return concealments;
}





function concealBraKet(eqn: string, selection: EditorSelection, eqnStartBound: number):Concealment[] {
    const langle = "〈";
    const rangle = "〉";
    const vert = "|";

    const regexStr = "\\\\(braket|bra|ket){";
    const symbolRegex = new RegExp(regexStr, "g");

    const matches = [...eqn.matchAll(symbolRegex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const loc = match.index + match[0].length;
        const j = findMatchingBracket(eqn, loc-1, "{", "}", false);

        if (j === -1) continue;

        const start = match.index;
        const end = start + match[0].length;

        if (selectionAndRangeOverlap(selection, eqnStartBound + start, eqnStartBound + end)) continue;
        if (selectionAndRangeOverlap(selection, eqnStartBound + j, eqnStartBound + j + 1)) continue;


        const type = match[1];
        const left = type === "ket" ? vert : langle;
        const right = type === "bra" ? vert : rangle;


        concealments.push({start: start, end: end, replacement: left, class: "cm-bracket"});
        concealments.push({start: j, end: j + 1, replacement: right, class: "cm-bracket"});
    }

    return concealments;
}




function conceal(view: EditorView) {

    const widgets: Range<Decoration>[] = []
    const selection = view.state.selection;


    for (const { from, to } of view.visibleRanges) {

        syntaxTree(view.state).iterate({ from, to, enter: (type, from, to) => {

            if (!(type.name.contains("begin") && type.name.contains("math"))) {
                return;
            }

            const bounds = getEquationBounds(view, to+1);
            if (!bounds) return;


            const eqn = view.state.doc.sliceString(bounds.start, bounds.end);


            const concealments = [
                ...concealSupSub(eqn, true, map_super),
                ...concealSupSub(eqn, false, map_sub),
                ...concealSymbols(eqn, "\\^", "", map_super),
                ...concealSymbols(eqn, "_", "", map_sub),
                ...concealSymbols(eqn, "\\\\", "", {...greek, ...cmd_symbols}),
                ...concealSymbols(eqn, "\\\\dot{", "}", dot),
                ...concealSymbols(eqn, "\\\\hat{", "}", hat),
                ...concealSymbols(eqn, "\\\\overline{", "}", bar),
                ...concealSymbols(eqn, "\\\\", "", brackets, "cm-bracket"),
                ...concealAtoZ(eqn, "\\\\mathcal{", "}", mathscrcal),
                ...concealBoldMathBbMathRm(eqn, mathbb),
                ...concealBraKet(eqn, selection, bounds.start)
            ];


            for (const concealment of concealments) {
                const start = bounds.start + concealment.start;
                const end = bounds.start + concealment.end;
                const symbol = concealment.replacement;

                if (selectionAndRangeOverlap(selection, start, end)) continue;


                widgets.push(
                    Decoration.replace({
                        widget: new ConcealWidget(symbol, concealment.class),
                        inclusive: false,
                        block: false,
                    }).range(start, end)
                );
            }
        }

        });
    }

    return Decoration.set(widgets, true)
}



export const concealPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet
    constructor(view: EditorView) {
        this.decorations = conceal(view)
    }
    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet)
            this.decorations = conceal(update.view)
    }
}, { decorations: v => v.decorations, });