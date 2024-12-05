import { Editor, EditorSelection } from "obsidian";
import { EditorView } from "@codemirror/view";
import { replaceRange, setCursor, setSelection } from "../utils/editor_utils";
import LatexSuitePlugin from "src/main";
import { Context } from "src/utils/context";
import { CodeMirrorEditor, Vim } from "src/utils/vim_types";
import { LatexSuitePluginSettings } from "src/settings/settings";


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
	defineType: "defineMotion"| "defineOperator" | "defineAction";
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
		action: (cm: CodeMirrorEditor) =>  {
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
export function getVimEditorCommands(settings: LatexSuitePluginSettings): vimCommand[] {
	return [
		getVimSelectModeCommand(settings),
		getVimVisualModeCommand(settings),
	]
}
