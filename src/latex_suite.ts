import { Prec, Extension } from "@codemirror/state";
import { EditorView, ViewUpdate, tooltips } from "@codemirror/view";

import { runSnippets } from "./features/run_snippets";
import { runAutoFraction } from "./features/autofraction";
import { tabout, shouldTaboutByCloseBracket } from "./features/tabout";
import { runMatrixShortcuts } from "./features/matrix_shortcuts";

import { Context } from "./utils/context";
import { consumeAndGotoNextTabstop, isInsideATabstop } from "./snippets/snippet_management";
import { removeAllTabstops } from "./snippets/codemirror/tabstops_state_field";
import { getLatexSuiteConfigExtension, getLatexSuiteConfig } from "./snippets/codemirror/config";
import { clearSnippetQueue } from "./snippets/codemirror/snippet_queue_state_field";
import { cursorTriggerStateField } from "./snippets/codemirror/cursor_trigger_state_field";
import { handleUndoRedo } from "./snippets/codemirror/history";
import { snippetExtensions } from "./snippets/codemirror/extensions";

import { concealPlugin } from "./editor_extensions/conceal";

import { LatexSuiteProcessedSettings } from "./settings/settings";
import { colorPairedBracketsPluginLowestPrec, highlightCursorBracketsPlugin } from "./editor_extensions/highlight_brackets";
import { cursorTooltipBaseTheme, cursorTooltipField } from "./editor_extensions/math_tooltip";

export const handleUpdate = (update: ViewUpdate) => {
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
	const success = handleKeydown(event.key, event.shiftKey, event.ctrlKey || event.metaKey, view);

	if (success) event.preventDefault();
}

export const handleKeydown = (key: string, shiftKey: boolean, ctrlKey: boolean, view: EditorView) => {

	const settings = getLatexSuiteConfig(view);

	const ctx = Context.fromView(view);
	// TODO(multisn8): remove this when the PR is done
	console.log(ctx);
	console.log(ctx.mode);

	let success = false;

	if (settings.basicSettings.snippetsEnabled) {

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

	if (settings.basicSettings.autofractionEnabled && ctx.mode.strictlyInMath()) {
		if (key === "/") {
			success = runAutoFraction(view, ctx);

			if (success) return true;
		}
	}

	// TODO(multisn8): currently matrices in inline math are a mess either way
	// but with the block/inline distinction, maybe we could try to stuff them inline
	// or "switch" to a block from inline if a matrix env is activated?
	if (settings.basicSettings.matrixShortcutsEnabled && ctx.mode.blockMath) {
		if (["Tab", "Enter"].contains(key)) {
			success = runMatrixShortcuts(view, ctx, key, shiftKey);

			if (success) return true;
		}
	}

	if (settings.basicSettings.taboutEnabled) {
		if (key === "Tab") {
			success = tabout(view, ctx);

			if (success) return true;
		}
	}

	return false;
}

export const handleTabstops = (view: EditorView) =>
{
	const success = consumeAndGotoNextTabstop(view);

	return success;
}

// CodeMirror extensions that are required for Latex Suite to run
export const latexSuiteExtensions = (settings: LatexSuiteProcessedSettings) => [
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