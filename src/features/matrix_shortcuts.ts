import { setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfigFromView } from "src/snippets/codemirror/config";
import { Context } from "src/utils/context";


export const runMatrixShortcuts = (ctx: Context, key: string, shiftKey: boolean):boolean => {
	const settings = getLatexSuiteConfigFromView(ctx.view);

	// Check whether we are inside a matrix / align / case environment
	let isInsideAnEnv = false;

	for (const envName of settings.parsedSettings.matrixShortcutsEnvNames) {
		const env = {openSymbol: "\\begin{" + envName + "}", closeSymbol: "\\end{" + envName + "}"};

		isInsideAnEnv = ctx.isWithinEnvironment(ctx.pos, env);
		if (isInsideAnEnv) break;
	}

	if (!isInsideAnEnv) return false;


	if (key === "Tab") {
		ctx.view.dispatch(ctx.view.state.replaceSelection(" & "));

		return true;
	}
	else if (key === "Enter") {
		if (shiftKey) {
			// Move cursor to end of next line
			const d = ctx.view.state.doc;

			const nextLineNo = d.lineAt(ctx.pos).number + 1;
			const nextLine = d.line(nextLineNo);

			setCursor(ctx.view, nextLine.to);
		}
		else {
			ctx.view.dispatch(ctx.view.state.replaceSelection(" \\\\\n"));
		}

		return true;
	}
	else {
		return false;
	}

}
