import { EditorView } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { TabstopGroup } from "../tabstop";

export const addTabstopsEffect = StateEffect.define<TabstopGroup[]>();
export const consumeTabstopEffect = StateEffect.define();
export const removeEmptyTabstopsEffect = StateEffect.define();
export const clearAllTabstopsEffect = StateEffect.define();

export const tabstopsStateField = StateField.define<TabstopGroup[]>({

	create() {
		return [];
	},

	update(value, transaction) {
		let tabstopGroups = value;
		tabstopGroups = tabstopGroups.map(tabstopGroup => tabstopGroup.map(transaction.changes));

		for (const effect of transaction.effects) {
			if (effect.is(addTabstopsEffect)) {
				tabstopGroups.unshift(...effect.value);
			}
			else if (effect.is(consumeTabstopEffect)) {
				tabstopGroups.shift();
			}
			else if (effect.is(clearAllTabstopsEffect)) {
				tabstopGroups = [];
			}
		}


		return tabstopGroups;
	}

});

export function addTabstops(view: EditorView, tabstopGroups: TabstopGroup[]) {
	view.dispatch({
		effects: [addTabstopsEffect.of(tabstopGroups)],
	});
}

export function consumeTabstop(view: EditorView) {
	view.dispatch({
		effects: [consumeTabstopEffect.of(null)],
	});
}

export function clearAllTabstops(view: EditorView) {
	view.dispatch({
		effects: [clearAllTabstopsEffect.of(null)],
	});
}