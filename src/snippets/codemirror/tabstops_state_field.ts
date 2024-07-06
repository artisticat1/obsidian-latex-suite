import { EditorView, Decoration } from "@codemirror/view";
import { EditorSelection, StateEffect, StateField } from "@codemirror/state";
import { TabstopGroup } from "../tabstop";

const addTabstopsEffect = StateEffect.define<TabstopGroup[]>();
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
			else if (effect.is(removeAllTabstopsEffect)) {
				tabstopGroups = [];
			}
		}

		// Remove the tabstop groups that the cursor has passed. This scenario
		// happens when the user manually moves the cursor using arrow keys or mouse
		if (transaction.selection) {
			const currTabstopGroupIndex = getCurrentTabstopGroupIndex(
				tabstopGroups,
				transaction.selection
			);
			tabstopGroups = tabstopGroups.slice(currTabstopGroupIndex);
			
			if (tabstopGroups.length <= 1) {
				// Clear all tabstop groups if there's just one remaining
				tabstopGroups = [];
			} else {
				tabstopGroups[0].hideFromEditor();
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

function getCurrentTabstopGroupIndex(
	tabstopGroups: TabstopGroup[],
	sel: EditorSelection
): number {
	for (let i = 0; i < tabstopGroups.length; i++) {
		const tabstopGroup = tabstopGroups[i];
		if (tabstopGroup.containsSelection(sel)) return i;
	}
	return tabstopGroups.length;
}

export function getTabstopGroupsFromView(view: EditorView) {
	const currentTabstopGroups = view.state.field(tabstopsStateField);

	return currentTabstopGroups;
}

export function addTabstops(view: EditorView, tabstopGroups: TabstopGroup[]) {
	view.dispatch({
		effects: [addTabstopsEffect.of(tabstopGroups)],
	});
}

export function removeAllTabstops(view: EditorView) {
	view.dispatch({
		effects: [removeAllTabstopsEffect.of(null)],
	});
}

// const COLORS = ["lightskyblue", "orange", "lime"];
const N_COLORS = 3;

export function getNextTabstopColor(view: EditorView) {
	const field = view.state.field(tabstopsStateField);
	const existingColors = field.map(tabstopGroup => tabstopGroup.color);
	const uniqueExistingColors = new Set(existingColors);

	for (let i = 0; i < N_COLORS; i++) {
		if (!uniqueExistingColors.has(i)) return i;
	}

	return 0;
}
