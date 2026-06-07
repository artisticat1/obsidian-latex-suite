import { ChangeDesc, EditorSelection, SelectionRange, Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { resetCursorBlink } from "src/utils/editor_utils";
import { endSnippet } from "./codemirror/history";
import { createElement } from "src/editor_extensions/obsidian_utils";

const LATEX_SUITE_TABSTOP_DECO_CLASS = "latex-suite-snippet-placeholder";

export interface TabstopSpec {
	/** index is an array such that tabstops can have "children" allowing for easier management when creating. */
    index: number[],
    from: number,
    to: number,
}

type TabstopGroupSpec = {
	index: number,
	from: number,
	to: number
}

function getMarkerDecoration(from: number, to: number, color: number) {
    const className = `${LATEX_SUITE_TABSTOP_DECO_CLASS} ${LATEX_SUITE_TABSTOP_DECO_CLASS}-${color}`;
	if (from === to) {
		const marker = Decoration.mark({
			inclusive: true,
			color: color,
			class: className,
		})
		// technically this is a widget decoration but the range should be behaving like a mark 
		// and thus increase in size when text is inserted
		return Decoration.prototype.range.call(marker, from, to) as Range<Decoration>
	} else {
		return Decoration.mark({
			inclusive: true,
			color: color,
			class: className,
		}).range(from, to);
	}
}

export class TabstopGroup {
    decos: DecorationSet;
    color: number;
    hidden: boolean;

    constructor(tabstopSpecs: TabstopGroupSpec[], color: number) {
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
            effects: isEndSnippet ? endSnippet.of(null) : undefined
        })
        resetCursorBlink(view);

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
            } else {
				ranges.push(createFieldMarker(cur.from, cur.to))
            }
            cur.next();
        }

        return ranges;
    }
	copy() {
		const newTabstopGroup = new TabstopGroup([], this.color);
		newTabstopGroup.decos = this.decos;
		newTabstopGroup.hidden = this.hidden;
		return newTabstopGroup;
	}
}

export function tabstopSpecsToTabstopGroups(tabstops: TabstopSpec[], color: number):TabstopGroup[] {
    const tabstopsByNumber: TabstopGroupSpec[][] = [];
	let currentIndex = 0;
	// normalize indexes first
	const sortedTabstops = tabstops.slice().sort((a,b) => {
		for (let i = 0; i < Math.min(a.index.length, b.index.length); i++) {
			if (a.index[i] != b.index[i]) {
				return a.index[i] - b.index[i];
			}
		}
		return a.index.length - b.index.length;
	}).map((ts, i, arr) => {
		if (i === 0) {
			return {...ts, index: currentIndex};
		}
		const isEqualIndex =
			ts.index.length === arr[i - 1].index.length &&
			ts.index.every((value, index) => value === arr[i - 1].index[index]);
		currentIndex += isEqualIndex ? 0 : 1;
		return {...ts, index: currentIndex};
	})
	
    for (const tabstop of sortedTabstops) {
		const n = tabstop.index;

        if (tabstopsByNumber[n]) {
            tabstopsByNumber[n].push(tabstop);
		}
		else {
            tabstopsByNumber[n] = [tabstop];
		}
	}

    const result = [];

    for (let number = 0; number < tabstopsByNumber.length; number++) {
        const grp = new TabstopGroup(tabstopsByNumber[number], color);
        result.push(grp);
    }

	return result;
}

export function getEditorSelectionEndpoints(sel: EditorSelection) {
    const endpoints = sel.ranges.map(range => EditorSelection.range(range.to, range.to));

    return EditorSelection.create(endpoints);
}

const FieldMarker = Decoration.widget({widget: new class extends WidgetType {

		toDOM() {
			const span = createElement("span");
			span.className = "cm-snippetFieldPosition";
			return span
		}
		ignoreEvent() {return false}
	}})
function createFieldMarker(from: number, to: number) {
	return FieldMarker.range(from,to)
}
