import { Editor, EditorSelection } from "obsidian";
import { EditorView } from "@codemirror/view";
import { replaceRange, setCursor, setSelection } from "../utils/editor_utils";
import LatexSuitePlugin from "src/main";
import { Context } from "src/utils/context";
import { CodeMirrorEditor, Vim } from "src/utils/vim_types";
import { LatexSuitePluginSettings } from "src/settings/settings";
import { runMatrixShortcuts } from "./matrix_shortcuts";
import { insertNewlineAndIndent } from "@codemirror/commands";
import { Transaction, Annotation, TransactionSpec } from "@codemirror/state";


function boxCurrentEquation(view: EditorView) {
	const ctx = Context.fromView(view);
	const result = ctx.getBounds();
	if (!result) return false;
	const {start, end} = result;

	let equation = "\\boxed{" + view.state.sliceDoc(start, end) + "}";


	// // Insert newlines if we're in a block equation
	const insideBlockEqn = view.state.sliceDoc(start-2, start) === "$$" && view.state.sliceDoc(end, end+2) === "$$";

	if (insideBlockEqn) equation = "\n" + equation + "\n";


	const pos = view.state.selection.main.to;
	replaceRange(view, start, end, equation);
	setCursor(view, pos + "\\boxed{".length + (insideBlockEqn ? 1 : 0));
}


function getBoxEquationCommand() {
	return {
		id: "latex-suite-box-equation",
		name: "Box current equation",
		editorCheckCallback: (checking: boolean, editor: Editor) => {

			// @ts-ignore
			const view = editor.cm;
			const ctx = Context.fromView(view);
			const withinEquation = ctx.mode.inMath();

			if (checking) return withinEquation;
			if (!withinEquation) return;

			boxCurrentEquation(view);

			return;

		},
	}
}


function getSelectEquationCommand() {
	return {
		id: "latex-suite-select-equation",
		name: "Select current equation",
		editorCheckCallback: (checking: boolean, editor: Editor) => {

			// @ts-ignore
			const view = editor.cm;
			const ctx = Context.fromView(view);
			const withinEquation = ctx.mode.inMath();

			if (checking) return withinEquation;
			if (!withinEquation) return;


			const result = ctx.getBounds();
			if (!result) return false;
			let {start, end} = result;

			// Don't include newline characters in the selection
			const doc = view.state.doc.toString();

			if (doc.charAt(start) === "\n") start++;
			if (doc.charAt(end - 1) === "\n") end--;


			setSelection(view, start, end);

			return;
		},
	}
}


function getEnableAllFeaturesCommand(plugin: LatexSuitePlugin) {
	return {
		id: "latex-suite-enable-all-features",
		name: "Enable all features",
		callback: async () => {
			plugin.settings.snippetsEnabled = true;
			plugin.settings.autofractionEnabled = true;
			plugin.settings.matrixShortcutsEnabled = true;
			plugin.settings.taboutEnabled = true;
			plugin.settings.autoEnlargeBrackets = true;

			await plugin.saveSettings();
		},
	}
}


function getDisableAllFeaturesCommand(plugin: LatexSuitePlugin) {
	return {
		id: "latex-suite-disable-all-features",
		name: "Disable all features",
		callback: async () => {
			plugin.settings.snippetsEnabled = false;
			plugin.settings.autofractionEnabled = false;
			plugin.settings.matrixShortcutsEnabled = false;
			plugin.settings.taboutEnabled = false;
			plugin.settings.autoEnlargeBrackets = false;

			await plugin.saveSettings();
		},
	}
}


export const getEditorCommands = (plugin: LatexSuitePlugin) => {
	return [
		getBoxEquationCommand(),
		getSelectEquationCommand(),
		getEnableAllFeaturesCommand(plugin),
		getDisableAllFeaturesCommand(plugin)
	];
};

export interface vimCommand {
	id: string;
	defineType: "defineMotion" | "defineOperator" | "defineAction";
	type: "action" | "operator" | "motion";
	action: (cm: CodeMirrorEditor) => void;
	key: string;
	context?: "normal" | "visual" | "replace" | "insert";
}

export function getVimSelectModeCommand(settings: LatexSuitePluginSettings): vimCommand {
	return {
		id: "latex-suite-vim-select-mode",
		defineType: "defineAction",
		type: "action",
		// copies current selection and selects it again since changing vim modes deletes the selection
		action: (cm: CodeMirrorEditor) => {
			//@ts-ignore undocumented object
			const vimObject: Vim | null = window?.CodeMirrorAdapter?.Vim;
			if (!vimObject) return;
			const selection: EditorSelection[] = cm.listSelections();
			vimObject.enterInsertMode(cm);
			cm.setSelections(selection);
		},
		key: settings.vimSelectMode,
		context: "visual",
	}
}

export function getVimVisualModeCommand(settings: LatexSuitePluginSettings): vimCommand {
	return {
		id: "latex-suite-vim-visual-mode",
		defineType: "defineAction",
		type: "action",
		// copies current selection and selects it again since changing vim modes deletes the selection
		action: (cm: CodeMirrorEditor) => {
			if (!cm.somethingSelected()) return;
			const selection: EditorSelection[] = cm.listSelections();
			//@ts-ignore undocumented object
			const vimObject: Vim | null = window?.CodeMirrorAdapter?.Vim;
			if (!vimObject) return;
			vimObject.exitInsertMode(cm);
			cm.setSelections(selection);
		},
		key: settings.vimVisualMode,
		context: "insert",
	}
}

export function getVimRunMatrixEnterCommand(settings: LatexSuitePluginSettings): vimCommand {
	return {
		id: "latex-suite-vim-special-enter",
		defineType: "defineAction",
		type: "action",
		action: (cm: CodeMirrorEditor) => {
			//@ts-ignore
			const vimObj: Vim | null = window?.CodeMirrorAdapter?.Vim;
			if (!vimObj) return;
			const cursorLine: number = cm.getCursor().line;
			const line: string = cm.getLine(cursorLine);
			cm.setCursor({line: cursorLine, ch: line.length + 1})
			const view = EditorView.findFromDOM(cm.getWrapperElement());
			const ctx = Context.fromView(view);
			if (runMatrixShortcuts(view, ctx, "Enter", false)) {
				vimObj.enterInsertMode(cm);
				return;
			}
			// code taken from vim plugin, documentation is not clear on what this does
			const succes: boolean = insertNewlineAndIndent({
				state: cm.cm6.state,
				dispatch: (transaction: Transaction & TransactionSpec) => {
					const view: EditorView = cm.cm6;
					// should not fire by the design of insertNewlineAndIndent but its in the vim plugin so it is included
					if (view.state.readOnly) return;
					let type: string = "input.type.compose";
					if (cm.curOp && !cm.curOp.lastChange) type = "input.type.compose.start";
					if (Array.isArray(transaction.annotations)) {
					try {
						transaction.annotations.forEach((note: Annotation<string|number|boolean>) => {
							//@ts-ignore its "supposed" to be readonly but it is not
							if (note.value === "input") note.value = type;
						});
					} catch (e) {
						console.error(e);
					}
					} else {
						transaction.userEvent =  type;
					}
					view.dispatch(transaction);
				}
			});
			if (!succes) console.error(`Failed to insert newline and indent latex-suite-insert-newline-and-indent`);
			// go into insert mode after the newline is inserted, otherwise macros rerun for some reason
			vimObj.enterInsertMode(cm);
		},
		key: settings.vimMatrixEnter,
		context: "normal",
	}
}

export function getVimEditorCommands(settings: LatexSuitePluginSettings): vimCommand[] {
	return [
		getVimSelectModeCommand(settings),
		getVimVisualModeCommand(settings),
		getVimRunMatrixEnterCommand(settings),
	]
}
