import { StateField } from "@codemirror/state";

export const cursorTriggerStateField = StateField.define<boolean>({
	create() {
		return false;
	},

	update(value, transaction) {
        if (transaction.docChanged) {
            return true;
        }

        if (transaction.selection) {
            if (value) {
                return false;
            }
        }
        return value;
	},
});