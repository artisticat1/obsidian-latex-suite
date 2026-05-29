import { ChangeSpec, Text } from "@codemirror/state"
import { TabstopSpec } from "../tabstop";
import { findMatchingBracket } from "src/utils/editor_utils";

export class SnippetChangeSpec {
    from: number;
    to: number;
    insert: string;
    keyPressed?: string;
	after?: number;

    constructor(from: number, to: number, insert: string, keyPressed?: string, after?: number) {
        this.from = from;
        this.to = to;
        this.insert = insert;
        this.keyPressed = keyPressed;
		this.after = after;
    }

    getTabstops(doc: Text, start: number):TabstopSpec[] {
        const tabstops:TabstopSpec[] = [];
		const text = doc.sliceString(start, start + this.insert.length);
        for (let i = 0; i < text.length; i++) {

            if (!(text.charAt(i) === "$")) {
                continue;
            }
    
			if (/\d/.test(text.charAt(i+1))) {
				const number:number = parseInt(text.charAt(i + 1));
		
				const tabstopStart = i;
				const tabstopEnd = tabstopStart + 2;
				const tabstopReplacement = "";

				// Replace the tabstop indicator "$X" with ""
				tabstops.push({
					number,
					from: tabstopStart + start,
					to: tabstopEnd + start,
					replacement: tabstopReplacement,
				})
				continue;

			} else if (text.charAt(i+1) === "{") {
                // Check for selection tabstops of the form ${\d+:XXX} where \d+ is some number of
                // digits and XXX is the replacement string, separated by a colon
				const tabstopStart = i;

 
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
				const rawTabstopNumber = tabstopString.slice(2, colonIndex);
				if (!/^\d+$/.test(rawTabstopNumber)) continue;
				const number: number = parseInt(rawTabstopNumber);
    
                if (closingIndex === -1) continue;
    
                // Isolate the replacement text from after the colon to the end of the tabstop bracket pair
                const tabstopReplacement = text.slice(i+colonIndex+1, closingIndex);
                const tabstopEnd = closingIndex + 1;
                i = closingIndex;
				const tabstop = {
					number: number,
					from: tabstopStart + start,
					to: tabstopEnd + start,
					replacement: tabstopReplacement,
				};
				// Replace the tabstop indicator "${\d+:XXX}" with "XXX"
				tabstops.push(tabstop);
				continue
            }
    
        }

        return tabstops;
    }

    toChangeSpec():ChangeSpec {
        return this;
    }
}
