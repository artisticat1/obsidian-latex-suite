// https://discuss.codemirror.net/t/concealing-syntax/3135

import { EditorView, ViewUpdate, Decoration, DecorationSet, WidgetType, ViewPlugin } from "@codemirror/view";
import { Range } from "@codemirror/state";
import { conceal } from "./conceal_fns";


export interface Concealment {
	start: number,
	end: number,
	replacement: string,
	class?: string,
	elementType?: string
}


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

// Build a decoration set from the given concealments
function buildDecoSet(concealments: Concealment[]) {
	const decos: Range<Decoration>[] = []

	for (const conc of concealments) {
		// Improve selecting empty replacements such as "\frac" -> ""
		// NOTE: This might not be necessary
		const inclusiveStart = conc.replacement === "";
		const inclusiveEnd = false;

		if (conc.start === conc.end) {
			// Add an additional "/" symbol, as part of concealing \\frac{}{} -> ()/()
			decos.push(
				Decoration.widget({
					widget: new TextWidget(conc.replacement),
					block: false,
				}).range(conc.start, conc.end)
			);
		}
		else {
			decos.push(
				Decoration.replace({
					widget: new ConcealWidget(
						conc.replacement,
						conc.class,
						conc.elementType
					),
					inclusiveStart,
					inclusiveEnd,
					block: false,
				}).range(conc.start, conc.end)
			);
		}
	}

	return Decoration.set(decos, true);
}

export const concealPlugin = ViewPlugin.fromClass(class {
	decorations: DecorationSet
	constructor(view: EditorView) {
		this.decorations = buildDecoSet(conceal(view));
	}
	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged || update.selectionSet)
			this.decorations = buildDecoSet(conceal(update.view));
	}
}, { decorations: v => v.decorations, });
