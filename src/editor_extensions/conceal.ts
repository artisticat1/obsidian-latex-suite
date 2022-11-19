// https://discuss.codemirror.net/t/concealing-syntax/3135

import { EditorView, ViewUpdate, Decoration, DecorationSet, WidgetType, ViewPlugin } from "@codemirror/view";
import { EditorSelection, Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { getEquationBounds, findMatchingBracket } from "./../editor_helpers";
import { cmd_symbols, greek, map_super, map_sub, brackets, mathbb, mathscrcal, fractions, operators } from "./conceal_maps";
// import { SNIPPET_VARIABLES } from "./snippets";


export interface Concealment {
    start: number,
    end: number,
    replacement: string,
    class?: string,
    elementType?: string
}


class ConcealWidget extends WidgetType {
    private readonly className: string;
    private readonly elementType: string;

    constructor(readonly symbol: string, className?: string, elementType?: string) {
        super();

        this.className = className ? className : "";
        this.elementType = elementType ? elementType : "span";
    }

    eq(other: ConcealWidget) {
        return ((other.symbol == this.symbol) && (other.elementType === this.elementType));
    }

    toDOM() {
        const span = document.createElement(this.elementType);
        span.className = "cm-math " + this.className;
        span.textContent = this.symbol;
        return span;
    }

    ignoreEvent() {
        return false;
    }
}


class TextWidget extends WidgetType {
    
    constructor(readonly symbol: string) {
        super();
    }
    
    eq(other: TextWidget) {
        return (other.symbol == this.symbol);
    }
    
    toDOM() {
        const span = document.createElement("span");
        span.className = "cm-math";
        span.textContent = this.symbol;
        return span;
    }
    
    ignoreEvent() {
        return false;
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
    const escapeChars = ["\\", "(", ")", "+", "-", "[", "]", "{", "}"];

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


function concealModifier(eqn: string, modifier: string, combiningCharacter: string):Concealment[] {

    const regexStr = ("\\\\" + modifier + "{([A-Za-z])}");
    const symbolRegex = new RegExp(regexStr, "g");


    const matches = [...eqn.matchAll(symbolRegex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const symbol = match[1];

        concealments.push({start: match.index, end: match.index + match[0].length, replacement: symbol + combiningCharacter, class: "latex-suite-unicode"});
    }

    return concealments;
}



function concealSupSub(eqn: string, superscript: boolean, symbolMap: {[key: string]:string}):Concealment[] {

    const prefix = superscript ? "\\^" : "_";
    const regexStr = prefix + "{([A-Za-z0-9\\()\\[\\]/+-=<>':;\\\\ *]+)}";
    const regex = new RegExp(regexStr, "g");

    const matches = [...eqn.matchAll(regex)];


    const concealments:Concealment[] = [];

    for (const match of matches) {

        const exponent = match[1];
        const elementType = superscript ? "sup" : "sub";


        // Conceal super/subscript symbols as well
        const symbolNames = Object.keys(symbolMap);

        const symbolRegexStr = "\\\\(" + escapeRegex(symbolNames.join("|")) + ")";
        const symbolRegex = new RegExp(symbolRegexStr, "g");

        const replacement = exponent.replace(symbolRegex, (a, b) => {
            return symbolMap[b];
        });


        concealments.push({start: match.index, end: match.index + match[0].length, replacement: replacement, class: "cm-number", elementType: elementType});
    }

    return concealments;
}




function concealBoldMathBbMathRm(eqn: string, symbolMap: {[key: string]:string}):Concealment[] {

    const regexStr = "\\\\(mathbf|boldsymbol|mathbb|mathrm){([A-Za-z0-9]+)}";
    const regex = new RegExp(regexStr, "g");

    const matches = [...eqn.matchAll(regex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const type = match[1];
        const value = match[2];

        const start = match.index;
        const end = start + match[0].length;

        if (type === "mathbf" || type === "boldsymbol") {
            concealments.push({start: start, end: end, replacement: value, class: "cm-concealed-bold cm-variable-1"});
        }
        else if (type === "mathbb") {
            const letters = Array.from(value);
            const replacement = letters.map(el => symbolMap[el]).join("");
            concealments.push({start: start, end: end, replacement: replacement});
        }
        else {
            concealments.push({start: start, end: end, replacement: value, class: "cm-concealed-mathrm cm-variable-2"});
        }

    }

    return concealments;
}



function concealText(eqn: string):Concealment[] {

    const regexStr = "\\\\text{([A-Za-z0-9-.!?() ]+)}";
    const regex = new RegExp(regexStr, "g");

    const matches = [...eqn.matchAll(regex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const value = match[1];

        const start = match.index;
        const end = start + match[0].length;

        concealments.push({start: start, end: end, replacement: value, class: "cm-concealed-mathrm cm-variable-2"});

    }

    return concealments;
}



function concealOperators(eqn: string, symbols: string[]):Concealment[] {

    const regexStr = "\\\\(" + symbols.join("|") + ")";
    const regex = new RegExp(regexStr, "g");

    const matches = [...eqn.matchAll(regex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const value = match[1];

        const start = match.index;
        const end = start + match[0].length;

        concealments.push({start: start, end: end, replacement: value, class: "cm-concealed-mathrm cm-variable-2"});
        
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
        const letters = Array.from(symbol);
        const replacement = letters.map(el => symbolMap[el]).join("");

        concealments.push({start: match.index, end: match.index + match[0].length, replacement: replacement, class: className});
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


        concealments.push({start: start, end: end - 1, replacement: ""});
        concealments.push({start: end - 1, end: end, replacement: left, class: "cm-bracket"});
        concealments.push({start: j, end: j + 1, replacement: right, class: "cm-bracket"});
    }

    return concealments;
}



function concealFraction(eqn: string, selection: EditorSelection, eqnStartBound: number):Concealment[] {

    const regexStr = "\\\\(frac){";
    const symbolRegex = new RegExp(regexStr, "g");

    const matches = [...eqn.matchAll(symbolRegex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const loc = match.index + match[0].length;
        const j = findMatchingBracket(eqn, loc-1, "{", "}", false);
        if (j === -1) continue;

        const charAfterFirstBracket = eqn.charAt(j+1);
        if (charAfterFirstBracket != "{") continue;
        const k = findMatchingBracket(eqn, j+1, "{", "}", false);
        if (k === -1) continue;

        const start = match.index;
        const end = start + match[0].length;

        if (selectionAndRangeOverlap(selection, eqnStartBound + start, eqnStartBound + end)) continue;
        if (selectionAndRangeOverlap(selection, eqnStartBound + j, eqnStartBound + j + 2)) continue;
        if (selectionAndRangeOverlap(selection, eqnStartBound + k, eqnStartBound + k + 1)) continue;


        concealments.push({start: start, end: end - 1, replacement: ""});
        concealments.push({start: end - 1, end: end, replacement: "(", class: "cm-bracket"});
        concealments.push({start: j, end: j + 1, replacement: ")", class: "cm-bracket"});
        concealments.push({start: j + 1, end: j + 1, replacement: "/", class: "cm-bracket"});
        concealments.push({start: j + 1, end: j + 2, replacement: "(", class: "cm-bracket"});
        concealments.push({start: k, end: k + 1, replacement: ")", class: "cm-bracket"});
    }

    return concealments;
}




function conceal(view: EditorView) {

    const widgets: Range<Decoration>[] = []
    const selection = view.state.selection;


    for (const { from, to } of view.visibleRanges) {

        syntaxTree(view.state).iterate({ from, to, enter: (node) => {
            const type = node.type;
            const to = node.to;

            if (!(type.name.contains("begin") && type.name.contains("math"))) {
                return;
            }

            const bounds = getEquationBounds(view, to+1);
            if (!bounds) return;


            const eqn = view.state.doc.sliceString(bounds.start, bounds.end);


            const ALL_SYMBOLS = {...greek, ...cmd_symbols};

            const concealments = [
                ...concealSymbols(eqn, "\\^", "", map_super),
                ...concealSymbols(eqn, "_", "", map_sub),
                ...concealSymbols(eqn, "\\\\frac", "", fractions),
                ...concealSymbols(eqn, "\\\\", "", ALL_SYMBOLS),
                ...concealSupSub(eqn, true, ALL_SYMBOLS),
                ...concealSupSub(eqn, false, ALL_SYMBOLS),
                ...concealModifier(eqn, "hat", "\u0302"),
                ...concealModifier(eqn, "dot", "\u0307"),
                ...concealModifier(eqn, "ddot", "\u0308"),
                ...concealModifier(eqn, "overline", "\u0304"),
                ...concealModifier(eqn, "bar", "\u0304"),
                ...concealSymbols(eqn, "\\\\", "", brackets, "cm-bracket"),
                ...concealAtoZ(eqn, "\\\\mathcal{", "}", mathscrcal),
                ...concealBoldMathBbMathRm(eqn, mathbb),
                ...concealText(eqn),
                ...concealBraKet(eqn, selection, bounds.start),
                ...concealFraction(eqn, selection, bounds.start),
                ...concealOperators(eqn, operators)
            ];


            for (const concealment of concealments) {
                const start = bounds.start + concealment.start;
                const end = bounds.start + concealment.end;
                const symbol = concealment.replacement;

                if (selectionAndRangeOverlap(selection, start, end)) continue;

                if (start === end) {
                    // Add an additional "/" symbol, as part of concealing \\frac{}{} -> ()/()
                    widgets.push(
                        Decoration.widget({
                            widget: new TextWidget(symbol),
                            block: false
                        }).range(start, end)
                    );
                }
                else {
                    widgets.push(
                        Decoration.replace({
                            widget: new ConcealWidget(symbol, concealment.class, concealment.elementType),
                            inclusive: false,
                            block: false,
                        }).range(start, end)
                    );
                }
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