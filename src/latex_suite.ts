import { EditorView, ViewPlugin, ViewUpdate, KeyBinding, runScopeHandlers } from "@codemirror/view";
import { runSnippets } from "./features/run_snippets";
import { runAutoFraction } from "./features/autofraction";
import { tabout, shouldTaboutByCloseBracket } from "./features/tabout";
import { runMatrixShortcuts } from "./features/matrix_shortcuts";

import { getContextPlugin } from "./utils/context";
import { getCharacterAtPos, replaceRange } from "./utils/editor_utils";
import { setSelectionToNextTabstop } from "./snippets/snippet_management";
import { removeAllTabstops } from "./snippets/codemirror/tabstops_state_field";
import { getLatexSuiteConfig } from "./snippets/codemirror/config";
import { clearSnippetQueue } from "./snippets/codemirror/snippet_queue_state_field";
import { handleUndoRedo } from "./snippets/codemirror/history";

import { handleMathTooltip } from "./editor_extensions/math_tooltip";
import { isComposing, forceEndComposition } from "./utils/editor_utils";
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

export const keyboardEventPlugin = ViewPlugin.fromClass(class {
	lastKeyboardEvent: KeyboardEvent | null = null;

	onKeydown(event: KeyboardEvent, view: EditorView) {
		if (event.key == "Unidentified" || event.key == "Process" || event.key == "Dead") {
			this.lastKeyboardEvent = event;
			return;
		} else {
			this.lastKeyboardEvent = null;
		}

		const success = handleKeydown(event.key, event.ctrlKey || event.metaKey, isComposing(view, event), view) || runScopeHandlers(view, event, "latex-suite");

		if (success) event.preventDefault();
	}
}, {
	eventHandlers: {
		keydown(event, view) {
			view.plugin(keyboardEventPlugin)!.onKeydown(event, view);
		},
	},

})

export const onInput = (view: EditorView, from: number, to: number, text: string): boolean => {
	const lastKeyboardEvent = view.plugin(keyboardEventPlugin)?.lastKeyboardEvent;
	if (text === "\0\0") return true;
	if (text.length == 1 && lastKeyboardEvent) {
		if (text === "\t") text = "Tab";
		const success = handleKeydown(
			text,
			lastKeyboardEvent.ctrlKey || lastKeyboardEvent.metaKey,
			isComposing(view, lastKeyboardEvent),
			view
		);
		if (success) {
			forceEndComposition(view);
			return true;
		}
	}
	return false;
}

export const handleKeydown = (key: string, ctrlKey: boolean, isIME: boolean, view: EditorView) => {
	if (key.length > 1) {
		return false
	}

	const settings = getLatexSuiteConfig(view);
	const ctx = getContextPlugin(view);

	if (
		!settings.snippetsEnabled ||
		// Prevent IME from triggering keydown events.
		(settings.suppressSnippetTriggerOnIME && isIME) ||
		// Allows Ctrl + z for undo, instead of triggering a snippet ending with z
		ctrlKey
	) {
		return false;
	}
	const snippets = settings.snippets.filter((s) => s.options.automatic);
	try {
		if (runSnippets(view, ctx, {snippets, key}, settings.snippetDebug)) return true;
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
		run: function autoDelete$(view: EditorView) {
			if (!getLatexSuiteConfig(view).autoDelete$) return false;
			const ctx = getContextPlugin(view);
			if (!ctx.mode.strictlyInMath()) return false;
			const charAtPos = getCharacterAtPos(view, ctx.pos);
			const charAtPrevPos = getCharacterAtPos(view, ctx.pos - 1);
			if (charAtPos === "$" && charAtPrevPos === "$") {
				replaceRange(view, ctx.pos - 1, ctx.pos + 1, "");
				// Note: not sure if removeAllTabstops is necessary
				removeAllTabstops(view);
				return true;
			}
			return false;
		},
	});
	
	const snippet_triggers = new Set(
		settings.snippets.map((s) => s.triggerKey).filter((s) => s !== null)
	);
	snippet_triggers.add(settings.snippetsTrigger);
	const runMaker = (key: string) => {
		const snippets = settings.snippets.filter(
			(s) =>
				s.triggerKey === key ||
				(!s.triggerKey &&
					!s.options.automatic &&
					key === settings.snippetsTrigger),
		);
		return (view: EditorView) => {
			const settings = getLatexSuiteConfig(view);
			if (!settings.snippetsEnabled) return false;
			// Prevent IME from triggering keydown events.
			if (settings.suppressSnippetTriggerOnIME && view.composing)
				return false;
			try {
				const ctx = getContextPlugin(view);
				return runSnippets(view, ctx, {snippets}, settings.snippetDebug);
			} catch (e) {
				clearSnippetQueue(view);
				console.error(e);
				return false;
			}
		};
	};

	keybindings.push(
		...Array.from(snippet_triggers, (key) => {
			return {
				key,
				run: runMaker(key),
			};
		})
	);

	keybindings.push({
		key: settings.snippetNextTabstopTrigger,
		run: function nextTabstop(view: EditorView) {
			return setSelectionToNextTabstop(view, false);
		},
	});

	keybindings.push({
		key: settings.snippetPreviousTabstopTrigger,
		run: function previousTabstop(view: EditorView) {
			return setSelectionToNextTabstop(view, true);
		},
	});

	keybindings.push({
		key: "/",
		run: function autofraction (view: EditorView) {
			if (!getLatexSuiteConfig(view).autofractionEnabled) return false;
			const ctx = getContextPlugin(view);
			if (!ctx.mode.strictlyInMath()) return false;
			return runAutoFraction(view, ctx);
		},
	});

	// Matrix shortcuts are intentionally put before tabout shortcuts,
	const matrixShortcuts = [
		{
			key: "Enter",
			run: function newlineMatrix(view: EditorView) {
				const ctx = getContextPlugin(view);
				if (!ctx.mode.strictlyInMath()) return false;
				return runMatrixShortcuts(view, ctx, "Enter", false);
			},
		},
		{
			key: "Tab",
			run: function newCellMatrix(view: EditorView) {
				const ctx = getContextPlugin(view);
				if (!ctx.mode.strictlyInMath()) return false;
				return runMatrixShortcuts(view, ctx, "Tab", false);
			},
		},
		{
			key: "Shift-Enter",
			run: function exitMatrix(view: EditorView) {
				const ctx = getContextPlugin(view);
				if (!ctx.mode.strictlyInMath()) return false;
				return runMatrixShortcuts(view, ctx, "Enter", true);
			},
		},
	];
	matrixShortcuts.forEach((keybinding) => {
		const run = keybinding.run;
		keybinding.run = (view: EditorView) => {
			if (!getLatexSuiteConfig(view).matrixShortcutsEnabled) return false;
			return run(view);
		};
	});
	keybindings.push(...matrixShortcuts);

	const taboutShortcuts = [
		{
			key: settings.taboutTrigger,
			run: function exitEquation(view: EditorView) {
				if (!view.state.selection.main.empty) return false;
				const ctx = getContextPlugin(view);
				return tabout(view, ctx);
			},
		},
		...[")", "}", "]"].map((key) => ({
			key,
			run: function nextClosingBracket(view: EditorView) {
				if (!shouldTaboutByCloseBracket(view, key)) return false;
				const ctx = getContextPlugin(view);
				return tabout(view, ctx);
			},
		})),
	];
	taboutShortcuts.forEach((keybinding) => {
		const run = keybinding.run;
		keybinding.run = (view: EditorView) => {
			if (!getLatexSuiteConfig(view).taboutEnabled) return false;
			return run(view);
		};
	});
	keybindings.push(...taboutShortcuts);

	return keybindings.map((keybinding) => ({
		...keybinding,
		scope: "latex-suite",
	}));
}

