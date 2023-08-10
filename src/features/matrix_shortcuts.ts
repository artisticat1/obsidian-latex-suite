import { setCursor } from "src/editor_helpers";
import { Context } from "src/snippets/context";


export const runMatrixShortcuts = (ctx: Context, key: string, shiftKey: boolean, matrixShortcutsEnvNames: string[]):boolean => {

	// Check whether we are inside a matrix / align / case environment
	let isInsideAnEnv = false;

	for (const envName of matrixShortcutsEnvNames) {
		const env = {openSymbol: "\\begin{" + envName + "}", closeSymbol: "\\end{" + envName + "}"};

		isInsideAnEnv = ctx.isInsideEnvironment(ctx.pos, env);
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
