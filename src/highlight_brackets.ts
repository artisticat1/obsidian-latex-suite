import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin } from "@codemirror/view";
import { Range } from "@codemirror/rangeset";
import { isWithinEquation, getEquationBounds, findMatchingBracket, getOpenBracket, getCloseBracket } from "./editor_helpers";


function getHighlightBracketMark(pos: number, className: string):Range<Decoration> {
    return Decoration.mark({
        inclusive: true,
        attributes: {},
        class: className
    }).range(pos, pos+1);
}


function highlightCursorBracket(view: EditorView) {

    const widgets: Range<Decoration>[] = []
    const selection = view.state.selection;
    const ranges = selection.ranges;
    const text = view.state.doc.toString();

    if (!isWithinEquation(view)) {
        return Decoration.set(widgets, true);
    }


    const bounds = getEquationBounds(view, selection.main.to);
    if (!bounds) return;
    const eqn = view.state.doc.sliceString(bounds.start, bounds.end);


    const openBrackets = ["{", "[", "("];
    const brackets = ["{", "[", "(", "}", "]", ")"];


    for (const range of ranges) {

        for (let i = range.to; i > range.from - 2; i--) {
            const char = text.charAt(i);
            if (!brackets.contains(char)) continue;


            let openBracket, closeBracket;
            let backwards = false;

            if (openBrackets.contains(char)) {
                openBracket = char;
                closeBracket = getCloseBracket(openBracket);
            }
            else {
                closeBracket = char;
                openBracket = getOpenBracket(char);
                backwards = true;
            }

            let j = findMatchingBracket(eqn, i - bounds.start, openBracket, closeBracket, backwards);

            if (j === -1) continue;
            j = j + bounds.start;


            widgets.push(getHighlightBracketMark(i, "latex-suite-highlighted-bracket"));
            widgets.push(getHighlightBracketMark(j, "latex-suite-highlighted-bracket"));

            break;
        }
    }

    return Decoration.set(widgets, true);
}


export const highlightBracketsPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet
    constructor(view: EditorView) {
        this.decorations = highlightCursorBracket(view)
    }
    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet)
            this.decorations = highlightCursorBracket(update.view)
    }
}, { decorations: v => v.decorations, });