import { ChangeSet, ChangeSpec } from "@codemirror/state"
import { TabstopSpec } from "../tabstop";
import { ResultInsert } from "../luasnip_api/node";

export class SnippetChangeSpec {
    from: number;
    to: number;
    insert: ResultInsert;
    keyPressed?: string;
	after?: number;

    constructor(from: number, to: number, insert: ResultInsert, keyPressed?: string, after?: number) {
        this.from = from;
        this.to = to;
        this.insert = insert;
        this.keyPressed = keyPressed;
		this.after = after;
    }

    getTabstops():TabstopSpec[] {
		return this.insert.tabstops.map(ts => {
			return {
				index: ts.index,
				from: this.from + ts.from,
				to: this.from + ts.to,
			}
		}); 
    }
	
	applyChange(change: ChangeSet): SnippetChangeSpec {
		const newFrom = change.mapPos(this.from, 1);
		const newTo = change.mapPos(this.to, 1);
		return new SnippetChangeSpec(newFrom, newTo, this.insert, this.keyPressed, this.after);		
	}

    toChangeSpec():ChangeSpec {
        return {
			from: this.from,
			to: this.to,
			insert: this.insert.insert,
		};
    }
}
