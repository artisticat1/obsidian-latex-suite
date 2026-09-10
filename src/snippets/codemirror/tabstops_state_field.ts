import { EditorView, Decoration } from "@codemirror/view";
import { EditorSelection, StateEffect, StateField } from "@codemirror/state";
import { TabstopGroup } from "../tabstop";
import { cmDarkClass } from "src/editor_extensions/obsidian_utils";

export const addTabstopsEffect = StateEffect.define<TabstopGroup[]>();
export const removeAllTabstopsEffect = StateEffect.define();
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
		return EditorView.outerDecorations.of(view => {
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

export const FIELD_MARKER_CLASS = "cm-snippetFieldPosition";
const PLACEHOLDER_CLASS = "latex-suite-snippet-placeholder"
const PLACEHOLDER_CSS_BG_VAR = "--placeholder-bg";
const PLACEHOLDER_CSS_OUTLINE_VAR = "--placeholder-outline";

export const tabstopTheme = EditorView.baseTheme({
	[`.${FIELD_MARKER_CLASS}`]: {
		verticalAlign: "text-top",
		width: "0",
		height: "1.15em",
		display: "inline-block",
		margin: "0 -0.7px -.7em",
		borderLeft: "1.4px dotted #888",
	},


	// These extra selectors enforce their color on all children, because CodeMirror does weird nesting of spans when
	// nesting multiple decorations.

	[`.${PLACEHOLDER_CLASS}`]: {
		borderRadius: "2px",
		backgroundColor: `var(${PLACEHOLDER_CSS_BG_VAR})`,
		outline: `var(${PLACEHOLDER_CSS_OUTLINE_VAR}) solid 1px`,
	},

	[`.${PLACEHOLDER_CLASS}-0, span.${PLACEHOLDER_CLASS}-0 span`]:
		{
			[PLACEHOLDER_CSS_BG_VAR]: "#87cefa2e",
			[PLACEHOLDER_CSS_OUTLINE_VAR]: "#87cefa6e",
		},

	[`${cmDarkClass} .${PLACEHOLDER_CLASS}-0, span.${PLACEHOLDER_CLASS}-0 span`]: {
		[PLACEHOLDER_CSS_OUTLINE_VAR]: "#87cefa43",
	},

	[`.${PLACEHOLDER_CLASS}-1, span.${PLACEHOLDER_CLASS}-1 span`]:
		{
			[PLACEHOLDER_CSS_BG_VAR]: "#ffa50033",
			[PLACEHOLDER_CSS_OUTLINE_VAR]: "#ffa5006b",
		},

	[`${cmDarkClass} .${PLACEHOLDER_CLASS}-1, span.${PLACEHOLDER_CLASS}-1 span`]: {
		[PLACEHOLDER_CSS_OUTLINE_VAR]: "#ffa5004d",
	},

	[`.${PLACEHOLDER_CLASS}-2, span.${PLACEHOLDER_CLASS}-2 span`]:
		{
			[PLACEHOLDER_CSS_BG_VAR]: "#0f02",
			[PLACEHOLDER_CSS_OUTLINE_VAR]: "#00ff0060",
		},

	[`${cmDarkClass} .${PLACEHOLDER_CLASS}-2, span.${PLACEHOLDER_CLASS}-2 span`]: {
		[PLACEHOLDER_CSS_OUTLINE_VAR]: "#00ff003d",
	},
});
