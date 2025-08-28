import { EditorView, KeyBinding, runScopeHandlers, ViewUpdate } from "@codemirror/view";

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
import { LatexSuiteCMSettings } from "./settings/settings";

export const handleUpdate = (update: ViewUpdate) => {
	const settings = getLatexSuiteConfig(update.state);

	// The math tooltip handler is driven by view updates because it utilizes
	// information about visual line, which is not available in EditorState
	if (settings.mathPreviewEnabled) {
		handleMathTooltip(update);
	}

	handleUndoRedo(update);
}

/**
 * A global variable to store the latest context.
 * This not the most elegant way of caching the context, but it works.
 */
let latestContext: Context | null = null;

export const onKeydown = (event: KeyboardEvent, view: EditorView) => {
	try {
		latestContext = Context.fromView(view);
		if (
			handleKeydown(
				event.key,
				event.ctrlKey || event.metaKey,
				isComposing(view, event),
				view
			) ||
			runScopeHandlers(view, event, "latex-suite")
		) {
			event.preventDefault();
			return;
		}
	} finally {
		latestContext = null;
	}
};

export const handleKeydown = (key: string, ctrlKey: boolean, isIME: boolean, view: EditorView) => {

	const settings = getLatexSuiteConfig(view);
	const ctx = latestContext ?? Context.fromView(view);

	if (
		!settings.snippetsEnabled ||
		// Prevent IME from triggering keydown events.
		(settings.suppressSnippetTriggerOnIME && isIME) ||
		// Allows Ctrl + z for undo, instead of triggering a snippet ending with z
		ctrlKey
	) {
		return false;
	}

	try {
		if (runSnippets(view, ctx, key)) return true;
	} catch (e) {
		clearSnippetQueue(view);
		console.error(e);
	}
	return false;
};

type LatexSuiteKeyBinding = KeyBinding & {scope: "latex-suite"};

/**
 * Get the keymaps specific for Latex Suite. These keymaps only run in scope `latex-suite`.
 * @param settings The settings with the keybindings to use
 * @returns The keymaps for the LaTeX suite based on the provided settings
 */
export function getKeymaps(settings: LatexSuiteCMSettings): LatexSuiteKeyBinding[] {
	// Order matters for keybindings, 
	// as they are checked in order from the beginning of the array to the end
	const keybindings: KeyBinding[] = [];

	/*
	 * When backspace is pressed, if the cursor is inside an empty inline math,
	 * delete both $ symbols, not just the first one.
	 */
	keybindings.push({
		key: "Backspace",
		run: (view: EditorView) => {
			if (!getLatexSuiteConfig(view).autoDelete$) return false;
			const ctx = latestContext ?? Context.fromView(view);
			if (!ctx.mode.strictlyInMath()) return false;
			const charAtPos = getCharacterAtPos(view, ctx.pos);
			const charAtPrevPos = getCharacterAtPos(view, ctx.pos - 1);
			if (charAtPos === "$" && charAtPrevPos === "$") {
				replaceRange(view, ctx.pos - 1, ctx.pos + 1, "");
				// Note: not sure if removeAllTabstops is necessary
				removeAllTabstops(view);
				return true;
			}
		},
	});

	keybindings.push({
		key: settings.snippetsTrigger,
		run: (view: EditorView) => {
			if (!getLatexSuiteConfig(view).snippetsEnabled) return;
			if (settings.suppressSnippetTriggerOnIME && view.composing) return;
			try {
				const ctx = latestContext ?? Context.fromView(view);
				return runSnippets(view, ctx, settings.snippetsTrigger);
			} catch (e) {
				clearSnippetQueue(view);
				console.error(e);
				return false;
			}
		},
	});

	keybindings.push({
		key: "Tab",
		run: (view: EditorView) => {
			return setSelectionToNextTabstop(view);
		},
	});

	keybindings.push({
		key: "/",
		run: (view: EditorView) => {
			if (!getLatexSuiteConfig(view).autofractionEnabled) return;
			const ctx = latestContext ?? Context.fromView(view);
			if (!ctx.mode.strictlyInMath()) return false;
			return runAutoFraction(view, ctx);
		},
	});

	// Matrix shortcuts are intentionally put before tabout shortcuts,
	const matrixShortcuts = [
		{
			key: "Enter",
			run: (view: EditorView) => {
				const ctx = latestContext ?? Context.fromView(view);
				if (!ctx.mode.strictlyInMath()) return;
				return runMatrixShortcuts(view, ctx, "Enter", false);
			},
		},
		{
			key: "Tab",
			run: (view: EditorView) => {
				const ctx = latestContext ?? Context.fromView(view);
				if (!ctx.mode.strictlyInMath()) return;
				return runMatrixShortcuts(view, ctx, "Tab", false);
			},
		},
		{
			key: "Shift-Enter",
			run: (view: EditorView) => {
				const ctx = latestContext ?? Context.fromView(view);
				if (!ctx.mode.strictlyInMath()) return;
				return runMatrixShortcuts(view, ctx, "Enter", true);
			},
		},
	];
	matrixShortcuts.map((keybinding) => {
		keybinding.run = (view: EditorView) => {
			if (!getLatexSuiteConfig(view).matrixShortcutsEnabled) return;
			return keybinding.run(view);
		};
	});
	keybindings.push(...matrixShortcuts);

	const taboutShortcuts = [
		{
			key: settings.taboutTrigger,
			run: (view: EditorView) => {
				if (!view.state.selection.main.empty) return;
				const ctx = latestContext ?? Context.fromView(view);
				return tabout(view, ctx);
			},
		},
		...[")", "}", "]"].map((key) => ({
			key,
			run: (view: EditorView) => {
				if (!shouldTaboutByCloseBracket(view, key)) return false;
				const ctx = latestContext ?? Context.fromView(view);
				return tabout(view, ctx);
			},
		})),
	];
	taboutShortcuts.map((keybinding) => {
		keybinding.run = (view: EditorView) => {
			if (!getLatexSuiteConfig(view).taboutEnabled) return false;
			return keybinding.run(view);
		};
	});
	keybindings.push(...taboutShortcuts);

	return keybindings.map((keybinding) => ({
		...keybinding,
		scope: "latex-suite",
	}));
}

