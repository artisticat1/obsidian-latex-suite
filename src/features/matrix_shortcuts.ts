import { EditorView } from "@codemirror/view";
import { setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Context } from "src/utils/context";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";

export const runMatrixShortcuts = (view: EditorView, ctx: Context, key: string, shiftKey: boolean): boolean => {
	const settings = getLatexSuiteConfig(view);

	const envs = settings.matrixShortcutsEnvNames.map((envName) => ({
		openSymbol: "\\begin{" + envName + "}",
		closeSymbol: "\\end{" + envName + "}",
	}));
	// Check whether we are inside a matrix / align / case environment
	const envBounds = ctx.isWithinEnvironment(ctx.pos, envs);
	if (!envBounds) return false;

	// Take main cursor since ctx.mode takes the main cursor, weird behaviour is expected with multicursor because of this.
	if (key === "Tab" && view.state.selection.main.empty) {
		view.dispatch(view.state.replaceSelection(" & "));

		return true;
	}
	else if (key === "Enter") {
		if (shiftKey && ctx.mode.blockMath) {
			// Move cursor to end of next line
			const d = view.state.doc;

			const nextLineNo = d.lineAt(ctx.pos).number + 1;
			const nextLine = d.line(nextLineNo);

			setCursor(view, nextLine.to);
		}
		else if (shiftKey && ctx.mode.inlineMath) {
			setCursor(view, envBounds.outer_end);
		}
		else if (ctx.mode.blockMath) {
			// Keep current indentation and callout characters
			queueSnippet(view, ctx.pos, ctx.pos, " \\\\\n$0");
			expandSnippets(view);
		}
		else {
			view.dispatch(view.state.replaceSelection(" \\\\ "));
		}

		return true;
	}
	else {
		return false;
	}

}
