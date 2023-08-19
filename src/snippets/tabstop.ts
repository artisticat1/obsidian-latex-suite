import { EditorSelection, SelectionRange } from "@codemirror/state";

export interface TabstopSpec {
    number: number,
    from: number,
    to: number,
    replacement: string
}

export type Tabstop = SelectionRange;
export type TabstopGroup = EditorSelection;

export function tabstopGroupLiesWithinAnother(a: TabstopGroup, b: TabstopGroup) {
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

export function getTabstopGroupEndpoints(sel: TabstopGroup) {
    const endpoints = sel.ranges.map(range => EditorSelection.range(range.to, range.to));

    return EditorSelection.create(endpoints);
}