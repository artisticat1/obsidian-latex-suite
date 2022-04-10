import { StateEffect, StateField } from "@codemirror/state";
import { Range, RangeSet } from "@codemirror/rangeset";
import { Decoration, EditorView } from "@codemirror/view";

export const addMark = StateEffect.define<Range<Decoration>>()
export const removeMark = StateEffect.define<Range<Decoration>>()
export const clearMarks = StateEffect.define();
export const removeMarkBySpecAttribute = StateEffect.define<{ attribute: string, reference: any }>()


export const undidStartSnippet = StateEffect.define();
export const redoSnippet = StateEffect.define();
export const undoSnippet = StateEffect.define();


export const markerStateField = StateField.define<RangeSet<Decoration>>({
    create() {
        return Decoration.none;
    },
    update(value, tr) {
        value = value.map(tr.changes);

        for (const effect of tr.effects) {
            if (effect.is(addMark)) {
                value = value.update({add: [effect.value]/*, sort: true*/});
            }
            else if (effect.is(removeMark)) {
                value = value.update({filter: (from, to, value) => {
                    return !(value.eq(effect.value.value));
                }});
            }
            else if (effect.is(clearMarks)) {
                value = value.update({filter: () => false});
            }
            else if (effect.is(removeMarkBySpecAttribute)) {
                value = value.update({filter: (from, to, ref) => ref.spec[effect.value.attribute] !== effect.value.reference});
            }
        }

        return value;
    },
    provide: f => EditorView.decorations.from(f)
})
