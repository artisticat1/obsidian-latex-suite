import { Editor } from "obsidian";
import { EditorView } from "@codemirror/view";
import { isWithinEquation, getEquationBounds, replaceRange, setCursor, setSelection } from "../editor_helpers";
import LatexSuitePlugin from "src/main";


function boxCurrentEquation(view: EditorView) {
	const result = getEquationBounds(view.state);
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
			const withinEquation = isWithinEquation(view.state);

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
			const withinEquation = isWithinEquation(view.state);

			if (checking) return withinEquation;
			if (!withinEquation) return;


			const result = getEquationBounds(view.state);
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
			plugin.settings.basicSettings.snippetsEnabled = true;
			plugin.settings.basicSettings.autofractionEnabled = true;
			plugin.settings.basicSettings.matrixShortcutsEnabled = true;
			plugin.settings.basicSettings.taboutEnabled = true;
			plugin.settings.basicSettings.autoEnlargeBrackets = true;

			await plugin.saveSettings();
		},
	}
}


function getDisableAllFeaturesCommand(plugin: LatexSuitePlugin) {
	return {
		id: "latex-suite-disable-all-features",
		name: "Disable all features",
		callback: async () => {
			plugin.settings.basicSettings.snippetsEnabled = false;
			plugin.settings.basicSettings.autofractionEnabled = false;
			plugin.settings.basicSettings.matrixShortcutsEnabled = false;
			plugin.settings.basicSettings.taboutEnabled = false;
			plugin.settings.basicSettings.autoEnlargeBrackets = false;

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
