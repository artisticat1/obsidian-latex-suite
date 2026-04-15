import { EditorView } from "@codemirror/view";
import { setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Bounds, getContextPlugin } from "src/utils/context";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { taboutByEnclosedBrackets } from "./tabout";

const newlineMatrixShortcutCallback = (view: EditorView): boolean => {
	const ctx = getContextPlugin(view);
	const cur_line = view.state.doc.lineAt(ctx.pos);
	const current_matrix_line = cur_line.text.match(/(?<=\\begin{[^]]*}|\\\\|^)(\s|\&)+/);
	const added_cells = current_matrix_line?.[0].trimStart() ?? ""
	if (ctx.mode.blockMath) {
		// Keep current indentation and callout characters
		queueSnippet(view, ctx.pos, ctx.pos, ` \\\\\n${added_cells}$0`);
		expandSnippets(view);
	} else {
		view.dispatch(view.state.replaceSelection(` \\\\  ${added_cells}`));
	}
	return true;
};

const taboutMatrixShortcutCallback = (view: EditorView, bounds: Bounds): boolean => {
	const ctx = getContextPlugin(view);
	if (ctx.mode.blockMath) {
		// Move cursor to end of next line
		const d = view.state.doc;

		const nextLineNo = d.lineAt(ctx.pos).number + 1;
		const nextLine = d.line(nextLineNo);

		setCursor(view, nextLine.to);
	}
	else if (ctx.mode.inlineMath) {
		setCursor(view, bounds.outer_end);
	}	
	return true;
}

const addCellMatrixShortcutCallback = (view: EditorView): boolean => {
	if (!view.state.selection.main.empty) {
		return false;
	}
	view.dispatch(view.state.replaceSelection(" & "));
	return true;
}

const matrixShortcutsRunner = (shortcut: (view: EditorView, bounds?: Bounds) => boolean) => (view: EditorView): boolean => {
	const ctx = getContextPlugin(view);
	if (!ctx.mode.strictlyInMath()) return false;
	const settings = getLatexSuiteConfig(view);

	const envs = settings.matrixShortcutsEnvNames.map((envName) => ({
		openSymbol: "\\begin{" + envName + "}",
		closeSymbol: "\\end{" + envName + "}",
	}));
	// Check whether we are inside a matrix / align / case environment
	const envBounds = ctx.isWithinEnvironment(ctx.pos, envs);
	if (!envBounds) return false;
	return shortcut(view, envBounds);
}

const priorityTaboutShortcutCallback = (view: EditorView): boolean => {
	const ctx = getContextPlugin(view);
	const currentLine = view.state.doc.lineAt(ctx.pos);
	const currentLineText = currentLine.text.slice(ctx.pos - currentLine.from);
	const bracketEnd = taboutByEnclosedBrackets(view, currentLineText);
	if (bracketEnd !== null) {
		setCursor(view, ctx.pos + bracketEnd);
		return true;
	}
	return false;
}

export const newlineMatrixShortcut = matrixShortcutsRunner(newlineMatrixShortcutCallback);
export const exitMatrixShortCut = matrixShortcutsRunner(taboutMatrixShortcutCallback);
export const addCellMatrixShortcut = matrixShortcutsRunner(addCellMatrixShortcutCallback);
export const priorityTaboutMatrixShortcut = matrixShortcutsRunner(priorityTaboutShortcutCallback);
