import { EditorView } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { TabstopReference } from "./snippet_manager";


export const addTabstopEffect = StateEffect.define<TabstopReference>();
export const addTabstopsEffect = StateEffect.define<TabstopReference[]>();
export const consumeTabstopEffect = StateEffect.define();
export const removeEmptyTabstopsEffect = StateEffect.define();
export const clearAllTabstopsEffect = StateEffect.define();


export const tabstopsStateField = StateField.define<TabstopReference[]>({

    create(editorState) {
        return [];
    },

    update(oldState, transaction) {
        let tabstopReferences = oldState;

        for (const effect of transaction.effects) {
            if (effect.is(addTabstopEffect)) {
                tabstopReferences.unshift(effect.value);
            }
            else if (effect.is(addTabstopsEffect)) {
                tabstopReferences.unshift(...effect.value);
            }
            else if (effect.is(consumeTabstopEffect)) {
                tabstopReferences.shift();
            }
            else if (effect.is(removeEmptyTabstopsEffect)) {
                tabstopReferences = tabstopReferences.filter(tabstopReference => tabstopReference.markers.length > 0);
            }
            else if (effect.is(clearAllTabstopsEffect)) {
                tabstopReferences = [];
            }
        }

        return tabstopReferences;
    },

});


export function addTabstop(view: EditorView, tabstopReference: TabstopReference) {
    view.dispatch({
        effects: [addTabstopEffect.of(tabstopReference)],
    });
}

export function addTabstops(view: EditorView, tabstopReferences: TabstopReference[]) {
    view.dispatch({
        effects: [addTabstopsEffect.of(tabstopReferences)],
    });
}

export function consumeTabstop(view: EditorView) {
    view.dispatch({
        effects: [consumeTabstopEffect.of(null)],
    });
}

export function removeEmptyTabstops(view: EditorView) {
    view.dispatch({
        effects: [removeEmptyTabstopsEffect.of(null)],
    });
}

export function clearAllTabstops(view: EditorView) {
    view.dispatch({
        effects: [clearAllTabstopsEffect.of(null)],
    });
}