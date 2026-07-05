import { EditorView } from "@codemirror/view";
import { isBoundMultiline, setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Bounds, getContextPlugin } from "src/utils/context";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { taboutByEnclosedBrackets } from "./tabout";
import { ArrayNode, emptyInsertOptions, TabstopNode, TextNode } from "src/snippets/luasnip_api/node";

const newlineMatrixShortcutCallback = (view: EditorView, bounds: Bounds): boolean => {
	const ctx = getContextPlugin(view);
	const cur_line = view.state.doc.lineAt(ctx.pos);
	const current_matrix_line = cur_line.text.match(/(\\begin{[^]]*}|\\\\|^)((?:\s|&)+)/);
	const added_cells = current_matrix_line?.[2].trimStart() ?? ""
	if (isBoundMultiline(view, bounds)) {
		const snippet = new ArrayNode([new TextNode(" \\\\\n" + added_cells), new TabstopNode(0,"")]);
		// Keep current indentation and callout characters
		queueSnippet(view, ctx.pos, ctx.pos, snippet.applyInsert(emptyInsertOptions));
		expandSnippets(view);
	} else {
		view.dispatch(view.state.replaceSelection(` \\\\  ${added_cells}`));
	}
	return true;
};

const taboutMatrixShortcutCallback = (view: EditorView, bounds: Bounds): boolean => {
	const ctx = getContextPlugin(view);
	if (isBoundMultiline(view, bounds)) {
		// Move cursor to end of next line
		const d = view.state.doc;

		const nextLineNo = d.lineAt(ctx.pos).number + 1;
		const nextLine = d.line(nextLineNo);
		const nextLineText = nextLine.text;
		const potentialEndMatrix = /\\end{([^}]*)}/.exec(nextLineText)

		let to = nextLine.to;
		if (potentialEndMatrix && potentialEndMatrix[1] && potentialEndMatrix.index !== undefined) {
			const envName = potentialEndMatrix[1];
			const settingsEnvNames = getLatexSuiteConfig(view).matrixShortcutsEnvNames;
			if (settingsEnvNames.includes(envName)) {
				to = nextLine.from + potentialEndMatrix.index + potentialEndMatrix[0].length;
			}
		}

		setCursor(view, to);
	}
	else {
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
	const bounds = ctx.getBounds();
	if (!bounds) return false;
	const envName = ctx.getEnvNames(ctx.pos).next().value;
	if (!envName) return false;

	const { matrixShortcutsEnvNames, matrixShortcutsMacroNames } = getLatexSuiteConfig(view);
	if (envName.kind === "environment" && !matrixShortcutsEnvNames.includes(envName.name)) {
		return false;
	} else if (envName.kind === "command" && !matrixShortcutsMacroNames.includes(envName.name)) {
		return false;
	} else if (envName.kind === "math") {
		return false;
	}
	return shortcut(view, envName);
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
