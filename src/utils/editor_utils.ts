import { Platform } from "obsidian";
import { EditorView } from "@codemirror/view";
import { SyntaxNode, TreeCursor } from "@lezer/common";
import { EditorState } from "@codemirror/state";

export function replaceRange(view: EditorView, start: number, end: number, replacement: string) {
	view.dispatch({
		changes: {from: start, to: end, insert: replacement}
	});
}

export function getCharacterAtPos(viewOrState: EditorView | EditorState, pos: number) {
	const state = viewOrState instanceof EditorView ? viewOrState.state : viewOrState;
	const doc = state.doc;
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
		(cursor.name != "Document") &&
		((dir == Direction.Backward && cursor.prev())
		|| (dir == Direction.Forward && cursor.next())
		|| cursor.parent())
	) {
		if (cursor.name.contains(target)) {
			return cursor.node;
		}
	}

	return null;
}


/**
 * Check if the user is typing in an IME composition.
 * Returns true even if the given event is the first keydown event of an IME composition.
 */
export function isComposing(view: EditorView, event: KeyboardEvent): boolean {
	// view.composing and event.isComposing are false for the first keydown event of an IME composition,
	// so we need to check for event.keyCode === 229 to prevent IME from triggering keydown events.
	// Note that keyCode is deprecated - it is used here because it is apparently the only way to detect the first keydown event of an IME composition.
	return view.composing || event.keyCode === 229;
}
