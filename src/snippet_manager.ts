import {Editor, EditorPosition} from "obsidian";
import {Range} from "@codemirror/rangeset";
import {Decoration} from "@codemirror/view";
import {editorToCodeMirrorState, editorToCodeMirrorView, findMatchingBracket} from "./editor_helpers";
import {addMark, clearMarks, markerStateField, removeMarkBySpecAttribute} from "./marker_state_field";

const COLORS = ["lightskyblue", "orange", "lime", "pink", "cornsilk", "magenta", "navajowhite"];


export class TabstopReference {
    editor: Editor
    colorIndex: number

    constructor(editor: Editor, colorIndex: number) {
        this.editor = editor;
        this.colorIndex = colorIndex;
    }

    getColorIndex():number {
        return this.colorIndex;
    }


    get markers(): Range<Decoration>[] {
        const state = editorToCodeMirrorState(this.editor);
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

    removeFromEditor(): void {
        editorToCodeMirrorView(this.editor).dispatch({
            effects: removeMarkBySpecAttribute.of({attribute: "reference", reference: this}),
        });
    }
}


export interface Tabstop {
    number: number,
    from: EditorPosition,
    to: EditorPosition,
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


    insertTabstop(editor:Editor, start: EditorPosition, end: EditorPosition, replacement:string, reference: TabstopReference) {
        const prefix = "latex-suite-suggestion-placeholder";
        const colorIndex = reference.getColorIndex();


        const mark = Decoration.mark({
            inclusive: true,
            class: prefix + " " + prefix + colorIndex,
            reference: reference
        }).range(
            editor.posToOffset(start),
            editor.posToOffset(end)
        );


        const editorView = editorToCodeMirrorView(editor);
        editorView.dispatch({effects: addMark.of(mark)});

        editor.replaceRange(replacement, start, end);

    }


    getTabstopsFromSnippet(editor: Editor, start: EditorPosition, replacement:string):Tabstop[] {
        const lines = replacement.split("\n");

        const tabstops:Tabstop[] = [];


        for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex--) {
            const line = lines[lineIndex];
            const lineBaseOffset = lineIndex === 0 ? start.ch : 0;

            for (let i = 0; i < line.length; i++) {

                if (!(line.charAt(i) === "$")) {
                    continue;
                }

                let number:number = parseInt(line.charAt(i + 1));
                let replacement = "";
                const tabstopStart = lineBaseOffset + i;
                let tabstopEnd = tabstopStart + 2;


                if (isNaN(number)) {
                    // Check for selection tabstops of the form ${0:XXX}
                    if (!(line.charAt(i+1) === "{" && line.charAt(i+3) === ":")) continue;


                    // Find the matching }
                    const closingIndex = findMatchingBracket(line, i+1, "{", "}", false);
                    if (closingIndex === -1) continue;


                    number = parseInt(line.charAt(i + 2));
                    if (isNaN(number)) continue;


                    replacement = line.slice(i+4, closingIndex);
                    tabstopEnd = lineBaseOffset + closingIndex + 1;
                    i = closingIndex;
                }


                // Replace the tabstop indicator "$X" with ""
                const tabstop:Tabstop = {number: number, from: {line: start.line + lineIndex, ch: tabstopStart}, to: {line: start.line + lineIndex, ch: tabstopEnd}, replacement: replacement};


                tabstops.push(tabstop);
            }
        }


        return tabstops;
    }


    insertTabstops(editor: Editor, tabstops: Tabstop[], append=false) {
        if (tabstops.length === 0) return;

        const colorIndex = this.getColorIndex();


        // Find unique tabstop numbers
        const numbers = Array.from(new Set(tabstops.map((tabstop: Tabstop) => (tabstop.number)))).sort().reverse();


        if (!append) {
            // Create a reference for each tabstop number
            // and add it to the list of current references
            for (let i = 0; i < numbers.length; i++) {
                const reference = new TabstopReference(editor, colorIndex);

                this.currentTabstopReferences.unshift(reference);
            }
        }


        // Insert the tabstops
        while (tabstops.length > 0) {
            const tabstop = tabstops.pop();
            const tabstopReference = this.currentTabstopReferences[tabstop.number];

            this.insertTabstop(editor, tabstop.from, tabstop.to, tabstop.replacement, tabstopReference);
        }

        this.selectTabstopReference(this.currentTabstopReferences[0]);
    }



    selectTabstopReference(reference: TabstopReference) {

        const markers = reference.markers;
        const editor = reference.editor;

        const selections = markers.map((marker) => {
            return {anchor: editor.offsetToPos(marker.from), head: editor.offsetToPos(marker.to)};
        });


        reference.editor.setSelections(selections);


        // Remove all tabstop references if there's just one containing zero width tabstops
        if (this.currentTabstopReferences.length === 1) {
            let shouldClear = true;

            for (const marker of markers) {
                if (!(marker.from === marker.to)) {
                    shouldClear = false;
                    break;
                }
            }

            if (shouldClear) this.clearAllTabstops();
        }

    }


    isInsideATabstop(cursor: EditorPosition):boolean {
        if (this.currentTabstopReferences.length === 0) {
            return false;
        }

        const editor = this.currentTabstopReferences[0].editor;
        const cursorIndex = editor.posToOffset(cursor);

        let isInside = false;

        for (const tabstopReference of this.currentTabstopReferences) {
            for (const marker of tabstopReference.markers) {
                if ((cursorIndex >= marker.from) && (cursorIndex <= marker.to)) {
                    isInside = true;
                    break;
                }
            }

            if (isInside) break;
        }

        return isInside;
    }



    consumeAndGotoNextTabstop(editor: Editor): boolean {
        const oldCursor = editor.getCursor();


        // Remove the tabstop that we're inside of
        const oldTabstop = this.currentTabstopReferences.shift();
        const oldMarkers = oldTabstop.markers;
        oldTabstop.removeFromEditor();


        // If there are none left, return
        if (this.currentTabstopReferences.length === 0)
            return false;


        // Select the next tabstop
        const newTabstop = this.currentTabstopReferences[0];
        const newMarkers = newTabstop.markers;

        const oldMarker = oldMarkers[0];
        const newMarker = newMarkers[0];

        // If the new tabstop has a single cursor, and
        // the old tabstop is inside of the new one, we just move the cursor
        if (newTabstop.markers.length === 1) {
            if (newMarker.from <= oldMarker.from && newMarker.to >= oldMarker.to) {
                editor.setCursor(editor.offsetToPos(newMarker.to));
            }
            else {
                this.selectTabstopReference(newTabstop);
            }
        }
        else {
            this.selectTabstopReference(newTabstop);
        }



        // If we haven't moved, go again
        const newCursor = editor.getCursor();
        if (newCursor.ch === oldCursor.ch)
            return this.consumeAndGotoNextTabstop(editor);


        return true;
    }


    clearAllTabstops() {
        if (this.currentTabstopReferences.length === 0)
            return;
        const firstRef = this.currentTabstopReferences[0];
        const view = editorToCodeMirrorView(firstRef.editor);
        view.dispatch({
            effects: clearMarks.of(null)
        });

        this.currentTabstopReferences = [];
    }


    onunload() {
        this.clearAllTabstops();
    }

}