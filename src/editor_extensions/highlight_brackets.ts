import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin } from "@codemirror/view";
import { Prec, Range } from "@codemirror/state";
import { isWithinEquation, getEquationBounds, findMatchingBracket, getOpenBracket, getCloseBracket, getEnclosingBracketsPos } from "./../editor_helpers";
import { syntaxTree } from "@codemirror/language";

const Ncolors = 3;


function getHighlightBracketMark(pos: number, className: string):Range<Decoration> {
    return Decoration.mark({
        inclusive: true,
        attributes: {},
        class: className
    }).range(pos, pos+1);
}


function colorPairedBrackets(view: EditorView) {

    const widgets: Range<Decoration>[] = []

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


            const openBrackets = ["{", "[", "("];
            const closeBrackets = ["}", "]", ")"];

            const bracketsStack = [];
            const bracketsPosStack = [];

            for (let i = 0; i < eqn.length; i++) {
                const char = eqn.charAt(i);

                if (openBrackets.contains(char)) {
                    bracketsStack.push(char);
                    bracketsPosStack.push(i);
                }
                else if (closeBrackets.contains(char)) {
                    const lastBracket = bracketsStack.at(-1);

                    if (getCloseBracket(lastBracket) === char) {
                        bracketsStack.pop();
                        const lastBracketPos = bracketsPosStack.pop();
                        const depth = bracketsStack.length % Ncolors;

                        const className = "latex-suite-color-bracket-" + depth;

                        const j = lastBracketPos + bounds.start;
                        const k = i + bounds.start;

                        widgets.push(getHighlightBracketMark(j, className));
                        widgets.push(getHighlightBracketMark(k, className));
                    }
                }
            }

        }

        });
    }

    return Decoration.set(widgets, true)
}


function highlightCursorBrackets(view: EditorView) {

    const widgets: Range<Decoration>[] = []
    const selection = view.state.selection;
    const ranges = selection.ranges;
    const text = view.state.doc.toString();

    if (!isWithinEquation(view)) {
        return Decoration.set(widgets, true);
    }


    const bounds = getEquationBounds(view, selection.main.to);
    if (!bounds) return Decoration.set(widgets, true);
    const eqn = view.state.doc.sliceString(bounds.start, bounds.end);


    const openBrackets = ["{", "[", "("];
    const brackets = ["{", "[", "(", "}", "]", ")"];


    let done = false;


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
            done = true;
            break;
        }

        if (done) break;
        
        
        // Highlight brackets enclosing the cursor
        if (range.empty) {
            const pos = range.from - 1;

            const result = getEnclosingBracketsPos(view, pos);
            if (result === -1) continue;
            
            widgets.push(getHighlightBracketMark(result.left, "latex-suite-highlighted-bracket"));
            widgets.push(getHighlightBracketMark(result.right, "latex-suite-highlighted-bracket"));
            done = true;
            break;
        }

        if (done) break;
    }

    return Decoration.set(widgets, true);
}


export const colorPairedBracketsPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet
    constructor(view: EditorView) {
        this.decorations = colorPairedBrackets(view)
    }
    update(update: ViewUpdate) {

        if (update.docChanged || update.viewportChanged) {
            this.decorations = colorPairedBrackets(update.view);
            // this.decorations = this.decorations.map(update.changes);

            // // Only update when a bracket was inserted
            // let shouldUpdate = false;

            // update.changes.iterChanges((fromA: number, toA: number, fromB: number, toB: number, inserted: Text) => {
            //     const insertion = inserted.toString();
            //     const brackets = ["(", "{", "[", ")", "}", "]"];

            //     if (brackets.some(bracket => insertion.contains(bracket))) {
            //         shouldUpdate = true;
            //     }
            // });

            // console.log("Should update", shouldUpdate);
            // if (shouldUpdate) this.decorations = colorPairedBrackets(update.view);
        }
    }
}, { decorations: v => v.decorations, });


export const colorPairedBracketsPluginLowestPrec = Prec.lowest(colorPairedBracketsPlugin.extension);


export const highlightCursorBracketsPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet
    constructor(view: EditorView) {
        this.decorations = highlightCursorBrackets(view)
    }
    update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet)
            this.decorations = highlightCursorBrackets(update.view)
    }
}, { decorations: v => v.decorations, });
