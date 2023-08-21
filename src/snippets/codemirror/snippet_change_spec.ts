import { EditorView } from "@codemirror/view";
import { ChangeSpec } from "@codemirror/state"
import { TabstopSpec } from "../tabstop";
import { findMatchingBracket } from "src/editor_helpers";

export class SnippetChangeSpec {
    from: number;
    to: number;
    insert: string;
    keyPressed?: string;

    constructor(from: number, to: number, insert: string, keyPressed?: string) {
        this.from = from;
        this.to = to;
        this.insert = insert;
        this.keyPressed = keyPressed;
    }

    getTabstops(view: EditorView, start: number):TabstopSpec[] {
        const tabstops:TabstopSpec[] = [];
        const text = view.state.doc.toString();

        for (let i = start; i < start + this.insert.length; i++) {

            if (!(text.charAt(i) === "$")) {
                continue;
            }

            let number:number = parseInt(text.charAt(i + 1));

            const tabstopStart = i;
            let tabstopEnd = tabstopStart + 2;
            let tabstopReplacement = "";


            if (isNaN(number)) {
                // Check for selection tabstops of the form ${0:XXX}
                if (!(text.charAt(i+1) === "{" && text.charAt(i+3) === ":")) continue;

                number = parseInt(text.charAt(i + 2));
                if (isNaN(number)) continue;

                // Find the matching }
                const closingIndex = findMatchingBracket(text, i+1, "{", "}", false, start + this.insert.length);

                if (closingIndex === -1) continue;

                tabstopReplacement = text.slice(i + 4, closingIndex);
                tabstopEnd = closingIndex + 1;
                i = closingIndex;
            }

            // Replace the tabstop indicator "$X" with ""
            const tabstop = {number: number, from: tabstopStart, to: tabstopEnd, replacement: tabstopReplacement};

            tabstops.push(tabstop);
        }

        return tabstops;
    }

    toChangeSpec():ChangeSpec {
        return this;
    }
}