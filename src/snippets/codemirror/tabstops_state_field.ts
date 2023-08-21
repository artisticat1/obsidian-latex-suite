import { EditorView, Decoration } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { TabstopGroup } from "../tabstop";

const addTabstopsEffect = StateEffect.define<TabstopGroup[]>();
const removeTabstopEffect = StateEffect.define();
const removeAllTabstopsEffect = StateEffect.define();

export const tabstopsStateField = StateField.define<TabstopGroup[]>({

	create() {
		return [];
	},

	update(value, transaction) {
		let tabstopGroups = value;
		tabstopGroups.forEach(grp => grp.map(transaction.changes));

		for (const effect of transaction.effects) {
			if (effect.is(addTabstopsEffect)) {
				tabstopGroups.unshift(...effect.value);
			}
			else if (effect.is(removeTabstopEffect)) {
				tabstopGroups.shift();
			}
			else if (effect.is(removeAllTabstopsEffect)) {
				tabstopGroups = [];
			}
		}


		return tabstopGroups;
	},

	provide: (field) => {
		return EditorView.decorations.of(view => {
			// "Flatten" the array of DecorationSets to produce a single DecorationSet
			const tabstopGroups = view.state.field(field);
			const decos = [];

			for (const tabstopGroup of tabstopGroups) {
				if (!tabstopGroup.hidden)
					decos.push(...tabstopGroup.getRanges());
			}

			return Decoration.set(decos, true);
		});
	}
});

export function getTabstopGroupsFromView(view: EditorView) {
	const currentTabstopGroups = view.state.field(tabstopsStateField);

	return currentTabstopGroups;
}

export function addTabstops(view: EditorView, tabstopGroups: TabstopGroup[]) {
	view.dispatch({
		effects: [addTabstopsEffect.of(tabstopGroups)],
	});
}

export function removeTabstop(view: EditorView) {
	view.dispatch({
		effects: [removeTabstopEffect.of(null)],
	});
}

export function removeAllTabstops(view: EditorView) {
	view.dispatch({
		effects: [removeAllTabstopsEffect.of(null)],
	});
}

// const COLORS = ["lightskyblue", "orange", "lime", "pink", "cornsilk", "magenta", "navajowhite"];
const N_COLORS = 7;

export function getNextTabstopColor(view: EditorView) {
	const field = view.state.field(tabstopsStateField);
	const existingColors = field.map(tabstopGroup => tabstopGroup.color);
	const uniqueExistingColors = new Set(existingColors);

	for (let i = 0; i < N_COLORS; i++) {
		if (!uniqueExistingColors.has(i)) return i;
	}

	return 0;
}