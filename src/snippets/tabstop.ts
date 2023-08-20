import { ChangeDesc, EditorSelection, SelectionRange } from "@codemirror/state";
import { Decoration, DecorationSet } from "@codemirror/view";

const LATEX_SUITE_TABSTOP_DECO_CLASS = "latex-suite-snippet-placeholder";

export interface TabstopSpec {
    number: number,
    from: number,
    to: number,
    replacement: string
}

function getMarkerDecoration(from: number, to: number, color: number, hidden = false) {
    const className = hidden ? "" : `${LATEX_SUITE_TABSTOP_DECO_CLASS} ${LATEX_SUITE_TABSTOP_DECO_CLASS}-${color}`;
    if (hidden) console.log("hidden!");

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

    toEditorSelection() {
        const ranges = [];
        const cur = this.decos.iter();

        while (cur.value != null) {
            ranges.push(EditorSelection.range(cur.from, cur.to));
            cur.next();
        }

        return EditorSelection.create(ranges);
    }

    hideFromEditor() {
        this.hidden = true;
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
    numbers.sort();

    for (const number of numbers) {
        const grp = new TabstopGroup(tabstopsByNumber[number], color);
        result.push(grp);
    }

	return result;
}

export function editorSelectionLiesWithinAnother(a: EditorSelection, b: EditorSelection) {
    function rangeLiesWithinSelection(range: SelectionRange, sel: EditorSelection) {
        for (const selRange of sel.ranges) {
            if (selRange.from <= range.from && selRange.to >= range.to) {
                return true;
            }
        }
        return false;
    }

    let result = true;

    for (const range of a.ranges) {
        if (!rangeLiesWithinSelection(range, b)) {
            result = false;
            break;
        }
    }
    return result;
}

export function getEditorSelectionEndpoints(sel: EditorSelection) {
    const endpoints = sel.ranges.map(range => EditorSelection.range(range.to, range.to));

    return EditorSelection.create(endpoints);
}