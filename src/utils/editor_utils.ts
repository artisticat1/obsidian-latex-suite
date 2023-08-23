import { Platform, Workspace, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";
import { SyntaxNode, TreeCursor } from "@lezer/common";

export function replaceRange(view: EditorView, start: number, end: number, replacement: string) {
	view.dispatch({
		changes: {from: start, to: end, insert: replacement}
	});
}

export function iterateCM6(workspace: Workspace, callback: (editor: EditorView) => unknown) {
    workspace.iterateAllLeaves(leaf => {
        leaf?.view instanceof MarkdownView &&
        (leaf.view.editor as any)?.cm instanceof EditorView &&
        callback((leaf.view.editor as any).cm);
    });
}

export function getCharacterAtPos(view: EditorView, pos: number) {
	const doc = view.state.doc;

	return doc.slice(pos, pos+1).toString();
}


export function setCursor(view: EditorView, pos: number) {
	view.dispatch({
		selection: {anchor: pos, head: pos}
	});

	resetCursorBlink();
}


export function setSelection(view: EditorView, start: number, end: number) {
	view.dispatch({
		selection: {anchor: start, head: end}
	});

	resetCursorBlink();
}


export function resetCursorBlink() {
	if (Platform.isMobile) return;

	const cursorLayer = document.getElementsByClassName("cm-cursorLayer")[0] as HTMLElement;

	if (cursorLayer) {
		const curAnim = cursorLayer.style.animationName;
		cursorLayer.style.animationName = curAnim === "cm-blink" ? "cm-blink2" : "cm-blink";
	}
}


export function reverse(s: string){
	return s.split("").reverse().join("");
}


export function findMatchingBracket(text: string, start: number, openBracket: string, closeBracket: string, searchBackwards: boolean, end?: number):number {
	if (searchBackwards) {
		const reversedIndex = findMatchingBracket(reverse(text), text.length - (start + closeBracket.length), reverse(closeBracket), reverse(openBracket), false);

		if (reversedIndex === -1) return -1;

		return text.length - (reversedIndex + openBracket.length)
	}

	let brackets = 0;
	const stop = end ? end : text.length;

	for (let i = start; i < stop; i++) {
		if (text.slice(i, i + openBracket.length) === openBracket) {
			brackets++;
		}
		else if (text.slice(i, i + closeBracket.length) === closeBracket) {
			brackets--;

			if (brackets === 0) {
				return i;
			}
		}
	}

	return -1;
}


export function getOpenBracket(closeBracket: string) {
	const openBrackets:{[closeBracket: string]: string} = {")": "(", "]": "[", "}": "{"};

	return openBrackets[closeBracket];
}


export function getCloseBracket(openBracket: string) {
	const closeBrackets:{[openBracket: string]: string} = {"(": ")", "[": "]", "{": "}"};

	return closeBrackets[openBracket];
}


export enum Direction {
	Backward,
	Forward,
}

/**
  * Searches for a token in siblings and parents, in only one direction.
  *
  * @param cursor: Where to start iteration
  * @param dir: In which direction to look for the target node
  * @param target: What substring the target node should have
  *
  * @returns The node found or null if none was found.
  */
export function escalateToToken(cursor: TreeCursor, dir: Direction, target: string): SyntaxNode | null {
	// Allow the starting node to be a match
	if (cursor.name.contains(target)) {
		return cursor.node;
	}

	while (
		(dir == Direction.Backward && cursor.prevSibling())
		|| (dir == Direction.Forward && cursor.nextSibling())
		|| cursor.parent()
	) {
		if (cursor.name.contains(target)) {
			return cursor.node;
		}
	}

	return null;
}
