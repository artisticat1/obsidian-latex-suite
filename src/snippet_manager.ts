import { Range } from "@codemirror/rangeset";
import { EditorView, Decoration } from "@codemirror/view";
import { SelectionRange, EditorSelection } from "@codemirror/state";
import { replaceRange, setCursor, setSelections, findMatchingBracket, resetCursorBlink } from "./editor_helpers";
import { addMark, clearMarks, markerStateField, removeMarkBySpecAttribute } from "./marker_state_field";

const COLORS = ["lightskyblue", "orange", "lime", "pink", "cornsilk", "magenta", "navajowhite"];


export class TabstopReference {
    view: EditorView
    colorIndex: number

    constructor(view: EditorView, colorIndex: number) {
        this.view = view;
        this.colorIndex = colorIndex;
    }

    getColorIndex():number {
        return this.colorIndex;
    }


    get markers(): Range<Decoration>[] {
        const state = this.view.state;
        const iter = state.field(markerStateField).iter();

        const markers = [];

        while (iter.value) {
            if (iter.value.spec.reference === this) {
                markers.push({
                    from: iter.from,
                    to: iter.to,
                    value: iter.value
                });
            }

            iter.next();
        }

        return markers;
    }


    get ranges(): SelectionRange[] {
        const state = this.view.state;
        const iter = state.field(markerStateField).iter();

        const ranges = [];

        while (iter.value) {
            if (iter.value.spec.reference === this) {

                ranges.push(EditorSelection.range(iter.from, iter.to));

            }

            iter.next();
        }

        return ranges;
    }


    removeFromEditor(): void {
        this.view.dispatch({
            effects: removeMarkBySpecAttribute.of({attribute: "reference", reference: this}),
        });
    }
}


export interface Tabstop {
    number: number,
    from: number,
    to: number,
    replacement: string
}


export class SnippetManager {
    private currentTabstopReferences: TabstopReference[] = [];


    getColorIndex():number {
        let colorIndex = 0;
        for (; colorIndex < COLORS.length; colorIndex++) {
            if (!this.currentTabstopReferences.find(p => p.getColorIndex() === colorIndex))
                break;
        }

        if (colorIndex === COLORS.length) {
            colorIndex = Math.floor(Math.random() * COLORS.length);
        }

        return colorIndex;
    }


    getColorClass(colorIndex: number):string {
        const prefix = "latex-suite-suggestion-placeholder";
        const markerClass = prefix + " " + prefix + colorIndex;

        return markerClass;
    }



    getTabstopsFromSnippet(view: EditorView, start: number, replacement:string):Tabstop[] {

        const tabstops:Tabstop[] = [];
        const text = view.state.doc.toString();


        for (let i = start; i < start + replacement.length; i++) {

            if (!(text.charAt(i) === "$")) {
                continue;
            }

            let number:number = parseInt(text.charAt(i + 1));

            const tabstopStart = i;
            let tabstopEnd = tabstopStart + 2;
            let tabstopReplacement = "";


            if (isNaN(number)) {
                // Check for selection tabstops of the form ${0:XXX}
                if (!(text.charAt(i+1) === "{" && text.charAt(i+3) === ":")) continue;

                number = parseInt(text.charAt(i + 2));
                if (isNaN(number)) continue;


                // Find the matching }
                const closingIndex = findMatchingBracket(text, i+1, "{", "}", false, start + replacement.length);

                if (closingIndex === -1) continue;


                tabstopReplacement = text.slice(i + 4, closingIndex);
                tabstopEnd = closingIndex + 1;
                i = closingIndex;
            }


            // Replace the tabstop indicator "$X" with ""
            const tabstop:Tabstop = {number: number, from: tabstopStart, to: tabstopEnd, replacement: tabstopReplacement};


            tabstops.push(tabstop);
        }


        return tabstops;
    }


    insertTabstops(view: EditorView, tabstops: Tabstop[], append=false) {
        if (tabstops.length === 0) return;


        // Find unique tabstop numbers
        const numbers = Array.from(new Set(tabstops.map((tabstop: Tabstop) => (tabstop.number)))).sort().reverse();


        if (!append) {
            // Create a reference for each tabstop number
            // and add it to the list of current references
            const colorIndex = this.getColorIndex();

            for (let i = 0; i < numbers.length; i++) {
                const reference = new TabstopReference(view, colorIndex);

                this.currentTabstopReferences.unshift(reference);
            }
        }


        // Insert the tabstops
        this.insertTabstopsTransaction(view, tabstops);
    }


    insertTabstopsTransaction(view: EditorView, tabstops: Tabstop[]) {

        // Add the markers
        const effects = tabstops.map((tabstop: Tabstop) => {
            const reference = this.currentTabstopReferences[tabstop.number];

            const mark = Decoration.mark({
                    inclusive: true,
                    attributes: {},
                    class: this.getColorClass(reference.colorIndex),
                    reference: reference
            }).range(tabstop.from, tabstop.to);

            return addMark.of(mark);
        });


        view.dispatch({
            effects: effects
        });


        // Select the first tabstop
        const ranges = this.currentTabstopReferences[0].ranges;
        view.dispatch({
            selection: EditorSelection.create(ranges)
        });


        // Insert the replacements
        const changes = tabstops.map((tabstop: Tabstop) => {
            return {from: tabstop.from, to: tabstop.to, insert: tabstop.replacement}
        });

        view.dispatch({
            changes: changes
        });


        resetCursorBlink();
    }



    selectTabstopReference(reference: TabstopReference) {

        // Select all ranges
        setSelections(reference.view, reference.ranges);


        // Remove all tabstop references if there's just one containing zero width tabstops
        if (this.currentTabstopReferences.length === 1) {
            let shouldClear = true;

            const markers = reference.markers;

            for (const marker of markers) {
                if (!(marker.from === marker.to)) {
                    shouldClear = false;
                    break;
                }
            }

            if (shouldClear) this.clearAllTabstops();
        }

    }


    isInsideATabstop(pos: number):boolean {
        if (this.currentTabstopReferences.length === 0) return false;

        let isInside = false;

        for (const tabstopReference of this.currentTabstopReferences) {
            for (const range of tabstopReference.ranges) {
                if ((pos >= range.from) && (pos <= range.to)) {
                    isInside = true;
                    break;
                }
            }

            if (isInside) break;
        }

        return isInside;
    }



    consumeAndGotoNextTabstop(view: EditorView): boolean {
        // Check whether there are currently any tabstops
        if (this.currentTabstopReferences.length === 0) return false;


        const oldCursor = view.state.selection.main;


        // Remove the tabstop that we're inside of
        const oldTabstop = this.currentTabstopReferences.shift();
        const oldMarkers = oldTabstop.markers;
        oldTabstop.removeFromEditor();


        // If there are none left, return
        if (this.currentTabstopReferences.length === 0) {
            setCursor(view, oldCursor.to);

            return true;
        }


        // Select the next tabstop
        const newTabstop = this.currentTabstopReferences[0];
        const newMarkers = newTabstop.markers;

        const oldMarker = oldMarkers[0];
        const newMarker = newMarkers[0];

        // If the new tabstop has a single cursor, and
        // the old tabstop is inside of the new one, we just move the cursor
        if (newTabstop.markers.length === 1) {
            if (newMarker.from <= oldMarker.from && newMarker.to >= oldMarker.to) {
                setCursor(view, newMarker.to)
            }
            else {
                this.selectTabstopReference(newTabstop);


                // Otherwise, if the new tabstop was positioned at the end of its snippet
                // i.e. it has 0 width and is aligned with the end of the next tabstop reference
                // Make it the same color as the next tabstop reference

                if (this.currentTabstopReferences.length > 1) {
                    const nextTabstopRef = this.currentTabstopReferences[1];
                    const lastMarker = nextTabstopRef.markers.at(-1);

                    if (newMarker.from === newMarker. to && newMarker.to === lastMarker.to) {
                        const colorIndex = nextTabstopRef.colorIndex;

                        newTabstop.colorIndex = colorIndex;
                        newMarker.value.spec.attributes.class = this.getColorClass(colorIndex);
                    }
                }
            }
        }
        else {
            this.selectTabstopReference(newTabstop);
        }



        // If we haven't moved, go again
        const newCursor = view.state.selection.main;

        if (oldCursor.eq(newCursor))
            return this.consumeAndGotoNextTabstop(view);


        return true;
    }


    tidyTabstopReferences() {
        // Remove empty tabstop references
        this.currentTabstopReferences = this.currentTabstopReferences.filter(tabstopReference => tabstopReference.markers.length > 0);


        // Remove overlapping markers of 0 width that have been created in the undo
        if (this.currentTabstopReferences.length > 0) {

            const seen:{ [pos:number]: TabstopReference[] } = {};

            for (const ref of this.currentTabstopReferences) {
                const ranges = ref.ranges;

                if (ranges.length === 1 && ranges[0].empty) {
                    const pos = ranges[0].to;

                    if (pos in seen) {
                        seen[pos].push(ref);
                    }
                    else {
                        seen[pos] = [ref];
                    }
                }
            }

            for (const pos in seen) {
                if (seen[pos].length > 1) {
                    for (const ref of seen[pos]) {
                        ref.removeFromEditor();
                        this.currentTabstopReferences.remove(ref);
                    }
                }
            }
        }
    }


    clearAllTabstops() {
        if (this.currentTabstopReferences.length === 0)
            return;

        const firstRef = this.currentTabstopReferences[0];

        const view = firstRef.view;
        view.dispatch({
            effects: clearMarks.of(null)
        });

        this.currentTabstopReferences = [];
    }


    onunload() {
        this.clearAllTabstops();
    }

}