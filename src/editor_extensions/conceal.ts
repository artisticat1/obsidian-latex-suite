// https://discuss.codemirror.net/t/concealing-syntax/3135

import { ViewUpdate, Decoration, DecorationSet, WidgetType, ViewPlugin, EditorView } from "@codemirror/view";
import { EditorSelection, Range, RangeSet, RangeSetBuilder, RangeValue } from "@codemirror/state";
import { conceal } from "./conceal_fns";
import { debounce, livePreviewState } from "obsidian";

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

// Represents how a concealment should be handled
// 'delay' means reveal after a time delay.
type ConcealAction = "conceal" | "reveal" | "delay";


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

/**
 * Determine if the two ConcealSpec instances before and after the update can be
 * considered identical.
 */
function atSamePosAfter(
	update: ViewUpdate,
	oldConceal: ConcealSpec,
	newConceal: ConcealSpec,
): boolean {
	if (oldConceal.length !== newConceal.length) return false;

	for (let i = 0; i < oldConceal.length; ++i) {
		// Set associativity to ensure that insertions on either side of the
		// concealed region do not expand the region
		const oldStartUpdated = update.changes.mapPos(oldConceal[i].start, 1);
		const oldEndUpdated = update.changes.mapPos(oldConceal[i].end, -1);
		const b = oldStartUpdated == newConceal[i].start && oldEndUpdated == newConceal[i].end;
		if (!b) return false;
	}

	return true;
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

/*
* We determine how to handle a concealment based on its 'cursorPosType' before
* and after an update and current mousedown state.
*
* When the mouse is down, we enable all concealments to make selecting math
* expressions easier.
*
* When the mouse is up, we follow the table below.
* The row represents the previous 'cursorPosType' and the column represents the
* current 'cursorPosType'. Each cell contains the action to be taken.
*
*        |  apart  |  edge  | within
* -----------------------------------
* apart  | conceal | delay  | reveal
* edge   | conceal | delay  | reveal
* within | conceal | reveal | reveal
* N/A    | conceal | reveal | reveal
*
* 'N/A' means that the concealment do not exist before the update, which should
* be judged by 'atSamePosAfter' function.
*/
function determineAction(
	oldCursor: Concealment["cursorPosType"] | undefined,
	newCursor: Concealment["cursorPosType"],
	mousedown: boolean,
	delayEnabled: boolean,
): ConcealAction {
	if (mousedown) return "conceal";

	if (newCursor === "apart") return "conceal";
	if (newCursor === "within") return "reveal";

	// newCursor === "edge"
	if (!delayEnabled) return "reveal";
	// delay is enabled
	if (!oldCursor || oldCursor === "within") return "reveal";
	else return "delay";
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

// Build atomic ranges from the given concealments.
// The resulting ranges are basically the same as the original replacements, but empty replacements
// are merged with the "next character," which can be either plain text or another replacement.
// This adjustment makes cursor movement around empty replacements more intuitive.
function buildAtomicRanges(concealments: Concealment[]) {
	const repls: Replacement[] = concealments
		.filter(c => c.enable)
		.flatMap(c => c.spec)
		.sort((a, b) => a.start - b.start);

	// RangeSet requires RangeValue but we do not need one
	const fakeval = new (class extends RangeValue {});
	const builder = new RangeSetBuilder();
	for (let i = 0; i < repls.length; i++) {
		if (repls[i].text === "") {
			if (i+1 != repls.length && repls[i].end == repls[i+1].start) {
				builder.add(repls[i].start, repls[i+1].end, fakeval);
				i++;
			} else {
				builder.add(repls[i].start, repls[i].end + 1, fakeval);
			}
		} else {
			builder.add(repls[i].start, repls[i].end, fakeval);
		}
	}
	return builder.finish();
}

export const mkConcealPlugin = (revealTimeout: number) => ViewPlugin.fromClass(class {
	// Stateful ViewPlugin: you should avoid one in general, but here
	// the approach based on StateField and updateListener conflicts with
	// obsidian's internal logic and causes weird rendering.
	concealments: Concealment[];
	decorations: DecorationSet;
	atomicRanges: RangeSet<RangeValue>;
	delayEnabled: boolean;


	constructor() {
		this.concealments = [];
		this.decorations = Decoration.none;
		this.atomicRanges = RangeSet.empty;
		this.delayEnabled = revealTimeout > 0;
	}

	delayedReveal = debounce((delayedConcealments: Concealment[], view: EditorView) => {
		// Implicitly change the state
		for (const concealment of delayedConcealments) {
			concealment.enable = false;
		}
		this.decorations = buildDecoSet(this.concealments);
		this.atomicRanges = buildAtomicRanges(this.concealments);

		// Invoke the update method to reflect the changes of this.decoration
		view.dispatch();
	}, revealTimeout, true);

	update(update: ViewUpdate) {
		if (!(update.docChanged || update.viewportChanged || update.selectionSet))
			return;

		// Cancel the delayed revealment whenever we update the concealments
		this.delayedReveal.cancel();

		const selection = update.state.selection;
		const mousedown = update.view.plugin(livePreviewState)?.mousedown;

		const concealSpecs = conceal(update.view);

		// Collect concealments from the new conceal specs
		const concealments: Concealment[] = [];
		// concealments that should be revealed after a delay (i.e. 'delay' action)
		const delayedConcealments: Concealment[] = [];

		for (const spec of concealSpecs) {
			const cursorPosType = determineCursorPosType(selection, spec);
			const oldConcealment = this.concealments.find(
				(old) => atSamePosAfter(update, old.spec, spec)
			);

			const concealAction = determineAction(
				oldConcealment?.cursorPosType, cursorPosType, mousedown, this.delayEnabled
			);

			const concealment: Concealment = {
				spec,
				cursorPosType,
				enable: concealAction !== "reveal",
			};

			if (concealAction === "delay") {
				delayedConcealments.push(concealment);
			}

			concealments.push(concealment);
		}

		if (delayedConcealments.length > 0) {
			this.delayedReveal(delayedConcealments, update.view);
		}

		this.concealments = concealments;
		this.decorations = buildDecoSet(this.concealments);
		this.atomicRanges = buildAtomicRanges(this.concealments);
	}
}, {
	decorations: v => v.decorations,
	provide: plugin => EditorView.atomicRanges.of(view => view.plugin(plugin).atomicRanges),
});
