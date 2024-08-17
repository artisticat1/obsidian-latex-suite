import { EditorView, ViewUpdate } from "@codemirror/view";

import { runSnippets } from "./features/run_snippets";
import { runAutoFraction } from "./features/autofraction";
import { tabout, shouldTaboutByCloseBracket } from "./features/tabout";
import { runMatrixShortcuts } from "./features/matrix_shortcuts";

import { Context } from "./utils/context";
import { getCharacterAtPos, replaceRange } from "./utils/editor_utils";
import { setSelectionToNextTabstop } from "./snippets/snippet_management";
import { removeAllTabstops } from "./snippets/codemirror/tabstops_state_field";
import { getLatexSuiteConfig } from "./snippets/codemirror/config";
import { clearSnippetQueue } from "./snippets/codemirror/snippet_queue_state_field";
import { handleUndoRedo } from "./snippets/codemirror/history";

import { handleMathTooltip } from "./editor_extensions/math_tooltip";
import { isComposing } from "./utils/editor_utils";

export const handleUpdate = (update: ViewUpdate) => {
	const settings = getLatexSuiteConfig(update.state);

	// The math tooltip handler is driven by view updates because it utilizes
	// information about visual line, which is not available in EditorState
	if (settings.mathPreviewEnabled) {
		handleMathTooltip(update);
	}

	handleUndoRedo(update);
}

export const onKeydown = (event: KeyboardEvent, view: EditorView) => {
	const success = handleKeydown(event.key, event.shiftKey, event.ctrlKey || event.metaKey, isComposing(view, event), view);

	if (success) event.preventDefault();
}

export const handleKeydown = (key: string, shiftKey: boolean, ctrlKey: boolean, isIME: boolean, view: EditorView) => {

	const settings = getLatexSuiteConfig(view);
	const ctx = Context.fromView(view);

	let success = false;

	/*
	* When backspace is pressed, if the cursor is inside an empty inline math,
	* delete both $ symbols, not just the first one.
	*/
	if (settings.autoDelete$ && key === "Backspace" && ctx.mode.inMath()) {
		const charAtPos = getCharacterAtPos(view, ctx.pos);
		const charAtPrevPos = getCharacterAtPos(view, ctx.pos - 1);

		if (charAtPos === "$" && charAtPrevPos === "$") {
			replaceRange(view, ctx.pos - 1, ctx.pos + 1, "");
			// Note: not sure if removeAllTabstops is necessary
			removeAllTabstops(view);
			return true;
		}
	}

	if (settings.snippetsEnabled) {

		// Prevent IME from triggering keydown events.
		if (settings.suppressSnippetTriggerOnIME && isIME) return;

		// Allows Ctrl + z for undo, instead of triggering a snippet ending with z
		if (!ctrlKey) {
			try {
				success = runSnippets(view, ctx, key);
				if (success) return true;
			}
			catch (e) {
				clearSnippetQueue(view);
				console.error(e);
			}
		}
	}

	if (key === "Tab") {
		success = setSelectionToNextTabstop(view);

		if (success) return true;
	}

	if (settings.autofractionEnabled && ctx.mode.strictlyInMath()) {
		if (key === "/") {
			success = runAutoFraction(view, ctx);

			if (success) return true;
		}
	}

	if (settings.matrixShortcutsEnabled && ctx.mode.blockMath) {
		if (["Tab", "Enter"].contains(key)) {
			success = runMatrixShortcuts(view, ctx, key, shiftKey);

			if (success) return true;
		}
	}

	if (settings.taboutEnabled) {
		if (key === "Tab" || shouldTaboutByCloseBracket(view, key)) {
			success = tabout(view, ctx);

			if (success) return true;
		}
	}

	return false;
}
