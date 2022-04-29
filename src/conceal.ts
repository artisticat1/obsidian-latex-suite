// https://discuss.codemirror.net/t/concealing-syntax/3135

import { EditorView, ViewUpdate, Decoration, DecorationSet, WidgetType, ViewPlugin } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { Range } from "@codemirror/rangeset";
import { syntaxTree } from "@codemirror/language";
import { getEquationBounds } from "./editor_helpers";
import { cmd_symbols, greek, map_super, map_sub, dot, hat, bar } from "./conceal_maps";


export interface Concealment {
    start: number,
    end: number,
    replacement: string
}


class ConcealWidget extends WidgetType {

    constructor(readonly symbol: string) {
        super()
    }

    eq(other: ConcealWidget) {
        return (other.symbol == this.symbol)
    }

    toDOM() {
        const span = document.createElement("span")
        span.className = "cm-math cm-concealed-sym" /* Formatting to be taken care of*/
        span.textContent = this.symbol
        return span;
    }

    ignoreEvent() {
        return false
    }
}


function selectionAndRangeOverlap(selection: EditorSelection, rangeFrom:
    number, rangeTo: number) {
    return (selection.main.from <= rangeTo) &&
        (selection.main.to) >= rangeFrom;
}



function concealSymbols(eqn: string, prefix: string, suffix: string, symbolMap: {[key: string]: string}):Concealment[] {
    const symbolNames = Object.keys(symbolMap);
    const symbolRegex = new RegExp(prefix + "(" + symbolNames.join("|") + ")" + suffix, "g");

    const matches = [...eqn.matchAll(symbolRegex)];

    const concealments:Concealment[] = [];

    for (const match of matches) {
        const symbol = match[1];

        concealments.push({start: match.index, end: match.index + match[0].length, replacement: symbolMap[symbol]});
    }

    return concealments;
}



function concealSupSub(eqn: string, superscript: boolean, symbolMap: {[key: string]:string}):Concealment[] {
    const symbolNames = Object.keys(symbolMap);

    const prefix = superscript ? "\\^" : "_";
    let regexStr = prefix + "{([" + symbolNames.join("|") + "]+)}";

    const escapeChars = ["(", ")", "+", "-"];
    for (const escapeChar of escapeChars) {
        regexStr = regexStr.replace("|" + escapeChar + "|", "|\\" + escapeChar + "|");
    }

    const regex = new RegExp(regexStr, "g");

    const matches = [...eqn.matchAll(regex)];


    const concealments:Concealment[] = [];

    for (const match of matches) {

        const exponent = match[1];
        let replacement = "";

        for (const letter of exponent.split("")) {
            replacement = replacement + symbolMap[letter];
        }

        concealments.push({start: match.index, end: match.index + match[0].length, replacement: replacement});
    }

    return concealments;
}



function conceal(view: EditorView) {

    const widgets: Range<Decoration>[] = []


    for (const { from, to } of view.visibleRanges) {

        syntaxTree(view.state).iterate({ from, to, enter: (type, from, to) => {

            if (!(type.name.contains("begin") && type.name.contains("math"))) {
                return;
            }

            const bounds = getEquationBounds(view, to+1);


            const eqn = view.state.doc.sliceString(bounds.start, bounds.end);


            const concealments = [
                ...concealSymbols(eqn, "\\\\", "", {...cmd_symbols, ...greek}),
                ...concealSupSub(eqn, true, map_super),
                ...concealSupSub(eqn, false, map_sub),
                ...concealSymbols(eqn, "\\\\dot{", "}", dot),
                ...concealSymbols(eqn, "\\\\hat{", "}", hat),
                ...concealSymbols(eqn, "\\\\overline{", "}", bar)
            ];


            for (const concealment of concealments) {
                const start = bounds.start + concealment.start;
                const end = bounds.start + concealment.end;
                const symbol = concealment.replacement;

                if (selectionAndRangeOverlap(view.state.selection, start, end)) continue;


                widgets.push(
                    Decoration.replace({
                        widget: new ConcealWidget(symbol),
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