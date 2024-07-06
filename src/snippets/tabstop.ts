import { ChangeDesc, EditorSelection, SelectionRange } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { resetCursorBlink } from "src/utils/editor_utils";
import { endSnippet } from "./codemirror/history";

const LATEX_SUITE_TABSTOP_DECO_CLASS = "latex-suite-snippet-placeholder";

export interface TabstopSpec {
    number: number,
    from: number,
    to: number,
    replacement: string
}

function getMarkerDecoration(from: number, to: number, color: number) {
    const className = `${LATEX_SUITE_TABSTOP_DECO_CLASS} ${LATEX_SUITE_TABSTOP_DECO_CLASS}-${color}`;

    return Decoration.mark({
        inclusive: true,
        color: color,
        class: className,
    }).range(from, to);
}

export class TabstopGroup {
    decos: DecorationSet;
    color: number;
    hidden: boolean;

    constructor(tabstopSpecs: TabstopSpec[], color: number) {
        const decos = tabstopSpecs.map(spec => getMarkerDecoration(spec.from, spec.to, color));
        this.decos = Decoration.set(decos, true);
        this.color = color;
        this.hidden = false;
    }

    select(view: EditorView, selectEndpoints: boolean, isEndSnippet: boolean) {
        const sel = this.toEditorSelection();
        const toSelect = selectEndpoints ? getEditorSelectionEndpoints(sel) : sel;

        view.dispatch({
            selection: toSelect,
            effects: isEndSnippet ? endSnippet.of(null) : null
        })
        resetCursorBlink();

        this.hideFromEditor();
    }

    toSelectionRanges() {
        const ranges = [];
        const cur = this.decos.iter();
    
        while (cur.value != null) {
            ranges.push(EditorSelection.range(cur.from, cur.to));
            cur.next();
        }

        return ranges;
    }

    toEditorSelection(endpoints = false) {
        let sel = EditorSelection.create(this.toSelectionRanges());
        if (endpoints)
            sel = getEditorSelectionEndpoints(sel);
        return sel;
    }

    containsSelection(selection: EditorSelection) {
        function rangeLiesWithinSelection(range: SelectionRange, sel: SelectionRange[]) {
            for (const selRange of sel) {
                if (selRange.from <= range.from && selRange.to >= range.to) {
                    return true;
                }
            }
            return false;
        }
    
        const tabstopRanges = this.toSelectionRanges();
        let result = true;
    
        for (const range of selection.ranges) {
            if (!rangeLiesWithinSelection(range, tabstopRanges)) {
                result = false;
                break;
            }
        }
        return result;
    }

    hideFromEditor() {
        this.hidden = true;
    }

    map(changes: ChangeDesc) {
        this.decos = this.decos.map(changes);
    }
    
    getRanges() {
        const ranges = [];
        const cur = this.decos.iter();

        while (cur.value != null) {
            if (cur.from != cur.to){
                ranges.push(cur.value.range(cur.from, cur.to));
            }
            cur.next();
        }

        return ranges;
    }
}

export function tabstopSpecsToTabstopGroups(tabstops: TabstopSpec[], color: number):TabstopGroup[] {
    const tabstopsByNumber: {[n: string]: TabstopSpec[]} = {};

    for (const tabstop of tabstops) {
        const n = String(tabstop.number);

        if (tabstopsByNumber[n]) {
            tabstopsByNumber[n].push(tabstop);
		}
		else {
            tabstopsByNumber[n] = [tabstop];
		}
	}

    const result = [];
    const numbers = Object.keys(tabstopsByNumber);
    numbers.sort((a,b) => parseInt(a) - parseInt(b));

    for (const number of numbers) {
        const grp = new TabstopGroup(tabstopsByNumber[number], color);
        result.push(grp);
    }

	return result;
}

export function getEditorSelectionEndpoints(sel: EditorSelection) {
    const endpoints = sel.ranges.map(range => EditorSelection.range(range.to, range.to));

    return EditorSelection.create(endpoints);
}
