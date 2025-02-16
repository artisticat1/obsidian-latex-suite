import { EditorView } from "@codemirror/view";
import { EditorSelection, SelectionRange } from "@codemirror/state";
import { Context } from "src/utils/context";
import { setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { tabout } from "src/features/tabout";


const ALIGNMENT = " & ";
const LINE_BREAK = " \\\\\n"
const LINE_BREAK_INLINE = " \\\\ "


const generateSeparatorChange = (separator: string, view: EditorView, range: SelectionRange): { from: number, to: number, insert: string } => {
	const d = view.state.doc;

	// Insert indents
	const fromLineText = d.lineAt(range.from).text;
	const leadingIndents = fromLineText.match(/^\s*/)[0];
	const fixed_separator = separator.replaceAll("\n", `\n${leadingIndents}`);

	return { from: range.from, to: range.to, insert: fixed_separator };
}


const applySeparator = (separator: string, view: EditorView) => {
	const sel = view.state.selection;
	const changes = sel.ranges.map(range => generateSeparatorChange(separator, view, range));

	const tempTransaction = view.state.update({ changes });

	const newSelection = EditorSelection.create(
		changes.map(({ from, to, insert }) =>
			EditorSelection.cursor(tempTransaction.changes.mapPos(from) + insert.length)
		),
		sel.mainIndex
	);

	view.dispatch(view.state.update({ changes, selection: newSelection }));
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

	if (key === "Tab") {
		applySeparator(ALIGNMENT, view);

		return true;
	}

	else if (key === "Enter") {
		if (shiftKey) {
			if (ctx.mode.inlineMath) {
				tabout(view, ctx);
			}
			else {
				// Move cursor to end of next line
				const d = view.state.doc;

				const nextLineNo = d.lineAt(ctx.pos).number + 1;
				const nextLine = d.line(nextLineNo);

				setCursor(view, nextLine.to);
			}
		}
		else {
			if (ctx.mode.inlineMath) {
				applySeparator(LINE_BREAK_INLINE, view);
			}
			else {
				applySeparator(LINE_BREAK, view);
			}
		}

		return true;
	}

	else {
		return false;
	}
}
