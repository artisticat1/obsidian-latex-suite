import { EditorView } from "@codemirror/view";
import { setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Context } from "src/utils/context";
import { tabout } from "src/features/tabout";

const OPEN_BRACKETS: {[bracket: string]: string} = {
	"{": "}",
	"[": "]",
	"(": ")",
	"\\langle": "\\rangle",
}

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
		// only run tabout if there is a closing bracket with no matching opening bracket before it.
		matrix_tabout: {
			const currentLine = view.state.doc.lineAt(ctx.pos);
			const match = currentLine.text.slice(0, ctx.pos - currentLine.from).match(/(\}|\]|\)|\\rangle)/g);
			if (!match){
				break matrix_tabout;
			}
			const closeBracket: {[bracket: string]: number} = {
				"}": 0,
				")": 0,
				"]": 0,
				"\\rangle": 0,
			}
			for (let i = ctx.pos - currentLine.from; i < currentLine.text.length; i++) {
				const char = currentLine.text[i];
				if (char in OPEN_BRACKETS) {
					closeBracket[OPEN_BRACKETS[char]]--;	
					continue
				}
				if (currentLine.text.slice(i, i + "\\langle".length) === "\\langle") {
					closeBracket["\\rangle"]--;
					i += "\\langle".length - 1;
					continue
				}
				if (char in closeBracket) {
					closeBracket[char]++;
					if (closeBracket[char] > 0) {
						setCursor(view, currentLine.from + i+1);
						return true
					}
				}
				if (currentLine.text.slice(i, i + "\\rangle".length) === "\\rangle"){
					closeBracket["\\rangle"]++;
					i += "\\rangle".length - 1
					if (closeBracket["\\rangle"] > 0) {
						setCursor(view, currentLine.from + i+1);
						return true
					}
				}
			}
		}
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
