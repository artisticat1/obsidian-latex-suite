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
	// Skip full update since the keymove can't trigger anything but can spamm the function a lot.
	if (event.key == "ArrowUp" || event.key == "ArrowDown" || event.key == "ArrowLeft" || event.key == "ArrowRight") {
		return;
	}

	const success = handleKeydown(event.key, event.shiftKey, event.ctrlKey || event.metaKey, isComposing(view, event), view);

	if (success) event.preventDefault();
}

export const handleKeydown = (key: string, shiftKey: boolean, ctrlKey: boolean, isIME: boolean, view: EditorView) => {
	const settings = getLatexSuiteConfig(view);
	
	// Early exit for IME and control key combinations
	if ((settings.suppressSnippetTriggerOnIME && isIME) || (ctrlKey && key !== "Tab")) {
		return false;
	}
	
	// Defer context creation until actually needed
	let ctx: Context;
	const getContext = () => ctx || (ctx = Context.fromView(view));
	
	// Handle Tab key early as it's a common operation
	if (key === "Tab") {
		if (setSelectionToNextTabstop(view)) return true;
		
		// Only check tabout if nothing is selected in the main cursor
		if (settings.taboutEnabled && view.state.selection.main.empty) {
			return tabout(view, getContext());
		}
		return false;
	}
	
	// Handle backspace efficiently for autoDelete$
	if (settings.autoDelete$ && key === "Backspace") {
		const pos = view.state.selection.main.head;
		const transaction = view.state.update({
			changes: { from: pos - 1, to: pos + 1, insert: "" },
			filter: false
		});
		
		const docText = view.state.sliceDoc(pos - 1, pos + 1);
		if (docText === "$$") {
			view.dispatch(transaction);
			removeAllTabstops(view);
			return true;
		}
	}
	
	// Handle bracket tabout (check without needing context if possible)
	if (settings.taboutEnabled && shouldTaboutByCloseBracket(view, key)) {
		return tabout(view, getContext());
	}
	
	// Now we need the context
	ctx = getContext();
	
	// Check if in math mode for math-specific features
	if (ctx.mode.strictlyInMath()) {
		// Fraction handling
		if (settings.autofractionEnabled && key === "/") {
			if (runAutoFraction(view, ctx)) return true;
		}
		
		// Matrix shortcuts
		if (settings.matrixShortcutsEnabled && ["Tab", "Enter"].contains(key)) {
			if (runMatrixShortcuts(view, ctx, key, shiftKey)) return true;
		}
	}
	
	// Handle snippets last as they're potentially expensive
	if (settings.snippetsEnabled && !ctrlKey) {
		try {
			if (runSnippets(view, ctx, key)) return true;
		} catch (e) {
			clearSnippetQueue(view);
			console.error(e);
		}
	}

	return false;
}
