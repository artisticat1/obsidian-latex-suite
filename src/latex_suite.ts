import { Prec, Extension } from "@codemirror/state";
import { EditorView, ViewUpdate, tooltips } from "@codemirror/view";

import { runSnippets } from "./features/run_snippets";
import { runAutoFraction } from "./features/autofraction";
import { tabout, shouldTaboutByCloseBracket } from "./features/tabout";
import { runMatrixShortcuts } from "./features/matrix_shortcuts";

import { Context } from "./utils/context";
import { consumeAndGotoNextTabstop, isInsideATabstop, tidyTabstops } from "./snippets/snippet_management";
import { removeAllTabstops } from "./snippets/codemirror/tabstops_state_field";
import { getLatexSuiteConfigExtension, getLatexSuiteConfig } from "./snippets/codemirror/config";
import { clearSnippetQueue } from "./snippets/codemirror/snippet_queue_state_field";
import { cursorTriggerStateField } from "./snippets/codemirror/cursor_trigger_state_field";
import { handleUndoRedo } from "./snippets/codemirror/history";
import { snippetExtensions } from "./snippets/codemirror/extensions";

import { concealPlugin } from "./editor_extensions/conceal";

import { LatexSuiteCMSettings } from "./settings/settings";
import { colorPairedBracketsPluginLowestPrec, highlightCursorBracketsPlugin } from "./editor_extensions/highlight_brackets";
import { cursorTooltipBaseTheme, cursorTooltipField, handleMathTooltip } from "./editor_extensions/math_tooltip";
import { isComposing } from "./utils/editor_utils";

export const handleUpdate = (update: ViewUpdate) => {
	// The math tooltip handler is driven by view updates because it utilizes
	// information about visual line, which is not available in EditorState
	handleMathTooltip(update);

	const cursorTriggeredByChange = update.state.field(cursorTriggerStateField, false);

	// Remove all tabstops when the user manually moves the cursor (e.g. on mouse click; using arrow keys)
	if (update.selectionSet) {
		if (!cursorTriggeredByChange) {
			if (!isInsideATabstop(update.view)) {
				removeAllTabstops(update.view);
			}
		}
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

	const taboutByCloseBracket = shouldTaboutByCloseBracket(view, key);

	if (key === "Tab" || taboutByCloseBracket) {
		success = handleTabstops(view);

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
		if (key === "Tab") {
			success = tabout(view, ctx);

			if (success) return true;
		}
	}

	tidyTabstops(view);

	return false;
}

export const handleTabstops = (view: EditorView) =>
{
	const success = consumeAndGotoNextTabstop(view);

	return success;
}

// CodeMirror extensions that are required for Latex Suite to run
export const latexSuiteExtensions = (settings: LatexSuiteCMSettings) => [
	getLatexSuiteConfigExtension(settings),
	Prec.highest(EditorView.domEventHandlers({"keydown": onKeydown})), // Register keymaps
	EditorView.updateListener.of(handleUpdate),
	snippetExtensions
];

// Optional CodeMirror extensions for optional features
export const optionalExtensions: {[feature: string]: Extension[]} = {
	"conceal": [concealPlugin.extension],
	"colorPairedBrackets": [colorPairedBracketsPluginLowestPrec],
	"highlightCursorBrackets": [highlightCursorBracketsPlugin.extension],
	"mathPreview": [cursorTooltipField.extension, cursorTooltipBaseTheme, tooltips({position: "absolute"})]
}