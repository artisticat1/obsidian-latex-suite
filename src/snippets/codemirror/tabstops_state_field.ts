import { EditorView, Decoration } from "@codemirror/view";
import { EditorSelection, StateEffect, StateField } from "@codemirror/state";
import { TabstopGroup } from "../tabstop";

const addTabstopsEffect = StateEffect.define<TabstopGroup[]>();
const removeAllTabstopsEffect = StateEffect.define();
type TabstopsState = {
	index: number,
	tabstopGroups: TabstopGroup[],
	color: number,
}
export const tabstopsStateField = StateField.define<TabstopsState>({

	create() {
		return {
			index: 0,
			tabstopGroups: [],
			color: 0,
		};
	},

	update(value, transaction) {
		let tabstopGroups = value.tabstopGroups;
		let color = value.color;
		// Optimization: tabstops that are added should already have their changes applied
		// So changes are only applied to existing tabstops
		tabstopGroups.forEach(grp => grp.map(transaction.changes));
	
		for (const effect of transaction.effects) {
			if (effect.is(addTabstopsEffect)) {
				tabstopGroups.splice(value.index, 1, ...effect.value);
			}
			else if (effect.is(removeAllTabstopsEffect)) {
				tabstopGroups = [];
				color = 0;
			}
		}

		let index = value.index;
		// Remove the tabstop groups that the cursor has passed. This scenario
		// happens when the user manually moves the cursor using arrow keys or mouse
		if (transaction.selection) {
			const currTabstopGroupIndex = getCurrentTabstopGroupIndex(
				tabstopGroups,
				transaction.selection
			);
			index = currTabstopGroupIndex;
			
			if (tabstopGroups.length <= 1 || index >= tabstopGroups.length-1) {
				// Clear all tabstop groups if there's just one remaining
				tabstopGroups = [];
				index = 0;
				color = 0;
			} else {
				tabstopGroups[0].hideFromEditor();
			}
		}

		return {
			index,
			tabstopGroups,
			color,
		};
	},

	provide: (field) => {
		return EditorView.decorations.of(view => {
			// "Flatten" the array of DecorationSets to produce a single DecorationSet
			const tabstopGroups = view.state.field(field).tabstopGroups;
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
	const currentTabstopGroups = view.state.field(tabstopsStateField).tabstopGroups;

	return currentTabstopGroups;
}

export function addTabstops(tabstopGroups: TabstopGroup[]) {
	return ({
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
	return view.state.field(tabstopsStateField).color++ % N_COLORS;
}
