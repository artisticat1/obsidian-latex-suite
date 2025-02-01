import { EditorView } from "@codemirror/view";
import { setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Context } from "src/utils/context";
import { tabout } from "src/features/tabout";

export const runMatrixShortcuts = (view: EditorView, ctx: Context, key: string, shiftKey: boolean): boolean => {
	const settings = getLatexSuiteConfig(view);

	// Check whether we are inside a matrix / align / case environment
	let isInsideAnEnv = false;

	for (const envName of settings.matrixShortcutsEnvNames) {
		const env = { openSymbol: "\\begin{" + envName + "}", closeSymbol: "\\end{" + envName + "}" };

		isInsideAnEnv = ctx.isWithinEnvironment(ctx.pos, env);
		if (isInsideAnEnv) break;
	}

	if (!isInsideAnEnv) return false;

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
			tabout(view, ctx);
		}
		else if (ctx.mode.blockMath) {
			const d = view.state.doc;
			const lineText = d.lineAt(ctx.pos).text;
			const matchIndents = lineText.match(/^\s*/);
			const leadingIndents = matchIndents ? matchIndents[0] : "";

			view.dispatch(view.state.replaceSelection(` \\\\\n${leadingIndents}`));
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
