// https://discuss.codemirror.net/t/concealing-syntax/3135

import { EditorView, ViewUpdate, Decoration, DecorationSet, WidgetType, ViewPlugin } from "@codemirror/view";
import { EditorSelection, Range } from "@codemirror/state";
import { conceal } from "./conceal_fns";
import { livePreviewState } from "obsidian";

export type Replacement = {
	start: number,
	end: number,
	text: string,
	class?: string,
	elementType?: string,
};

export type ConcealSpec = Replacement[];

/**
 * Make a ConcealSpec from the given list of Replacements.
 * This function essentially does nothing but improves readability.
 */
export function mkConcealSpec(...replacements: Replacement[]) {
	return replacements;
}

export type Concealment = {
	spec: ConcealSpec,
	cursorPosType: "within" | "apart" | "edge",
	enable: boolean,
};


class ConcealWidget extends WidgetType {
	private readonly className: string;
	private readonly elementType: string;

	constructor(readonly symbol: string, className?: string, elementType?: string) {
		super();

		this.className = className ? className : "";
		this.elementType = elementType ? elementType : "span";
	}

	eq(other: ConcealWidget) {
		return ((other.symbol == this.symbol) && (other.className === this.className) && (other.elementType === this.elementType));
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

function determineCursorPosType(
	sel: EditorSelection,
	concealSpec: ConcealSpec,
): Concealment["cursorPosType"] {
	// Priority: "within" > "edge" > "apart"

	let cursorPosType: Concealment["cursorPosType"] = "apart";

	for (const range of sel.ranges) {
		for (const replace of concealSpec) {
			// 'cursorPosType' is guaranteed to be "edge" or "apart" at this point
			const overlapRangeFrom = Math.max(range.from, replace.start);
			const overlapRangeTo = Math.min(range.to, replace.end);

			if (
				overlapRangeFrom === overlapRangeTo &&
				(overlapRangeFrom === replace.start || overlapRangeFrom === replace.end)
			) {
				cursorPosType = "edge";
				continue;
			}

			if (overlapRangeFrom <= overlapRangeTo) return "within";
		}
	}

	return cursorPosType;
}

function buildConcealment(spec: ConcealSpec, view: EditorView) {
	const cursorPosType = determineCursorPosType(view.state.selection, spec);

	// When the mouse is down, we enable all concealments to make selecting
	// math expressions easier.
	const mousedown = view.plugin(livePreviewState)?.mousedown;
	const enable = mousedown || cursorPosType === "apart";

	return { spec, cursorPosType, enable };
}

// Build a decoration set from the given concealments
function buildDecoSet(concealments: Concealment[]) {
	const decos: Range<Decoration>[] = []

	for (const conc of concealments) {
		if (!conc.enable) continue;

		for (const replace of conc.spec) {
			if (replace.start === replace.end) {
				// Add an additional "/" symbol, as part of concealing \\frac{}{} -> ()/()
				decos.push(
					Decoration.widget({
						widget: new TextWidget(replace.text),
						block: false,
					}).range(replace.start, replace.end)
				);
			}
			else {
				// Improve selecting empty replacements such as "\frac" -> ""
				// NOTE: This might not be necessary
				const inclusiveStart = replace.text === "";
				const inclusiveEnd = false;

				decos.push(
					Decoration.replace({
						widget: new ConcealWidget(
							replace.text,
							replace.class,
							replace.elementType
						),
						inclusiveStart,
						inclusiveEnd,
						block: false,
					}).range(replace.start, replace.end)
				);
			}
		}
	}

	return Decoration.set(decos, true);
}

export const concealPlugin = ViewPlugin.fromClass(class {
	concealments: Concealment[];
	decorations: DecorationSet;

	updateFields(view: EditorView) {
		this.concealments = conceal(view).map(spec => buildConcealment(spec, view));
		this.decorations = buildDecoSet(this.concealments);
	}

	constructor(view: EditorView) {
		this.updateFields(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged || update.selectionSet)
			this.updateFields(update.view);
	}
}, { decorations: v => v.decorations, });
