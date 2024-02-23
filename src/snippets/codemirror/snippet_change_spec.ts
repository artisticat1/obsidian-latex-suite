import { EditorView } from "@codemirror/view";
import { ChangeSpec } from "@codemirror/state"
import { TabstopSpec } from "../tabstop";
import { findMatchingBracket } from "src/utils/editor_utils";

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
                // Check for selection tabstops of the form ${\d+:XXX} where \d+ is some number of
                // digits and XXX is the replacement string, separated by a colon
                if (!(text.charAt(i+1) === "{")) continue;
    
                // Find the index of the matching closing bracket
                const closingIndex = findMatchingBracket(text, i+1, "{", "}", false, start + this.insert.length);
                
                // Create a copy of the entire tabstop string from the document
                const tabstopString = text.slice(i, closingIndex+1);
    
                // If there is not a colon in the tabstop string, it is incorrectly formatted
                if (!tabstopString.includes(":")) continue;
    
                // Get the first index of a colon, which we will use as our number/replacement split point
                const colonIndex = tabstopString.indexOf(":");
    
                // Parse the number from the tabstop string, which is all characters after the {
                // and before the colon index
                number = parseInt(tabstopString.slice(2, colonIndex));
                if (isNaN(number)) continue;
                
    
                if (closingIndex === -1) continue;
    
                // Isolate the replacement text from after the colon to the end of the tabstop bracket pair
                tabstopReplacement = text.slice(i+colonIndex+1, closingIndex);
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