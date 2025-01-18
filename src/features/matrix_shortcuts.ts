import { EditorView } from "@codemirror/view";
import { setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Context } from "src/utils/context";
import { tabout } from "src/features/tabout";

export const runMatrixShortcuts = (view: EditorView, ctx: Context, key: string, shiftKey: boolean):boolean => {
	const settings = getLatexSuiteConfig(view);

	// Check whether we are inside a matrix / align / case environment
	let isInsideAnEnv = false;

	for (const envName of settings.matrixShortcutsEnvNames) {
		const env = {openSymbol: "\\begin{" + envName + "}", closeSymbol: "\\end{" + envName + "}"};

		isInsideAnEnv = ctx.isWithinEnvironment(ctx.pos, env);
		if (isInsideAnEnv) break;
	}

	if (!isInsideAnEnv) return false;


	if (key === "Tab") {
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
			tabout(view, ctx);
		}
		else {
			const lineBreakStr = (ctx.mode.inlineMath) ? " \\\\ " : " \\\\\n";
			view.dispatch(view.state.replaceSelection(lineBreakStr));
		}

		return true;
	}
	else {
		return false;
	}

}
