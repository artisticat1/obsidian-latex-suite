import { EditorView } from "@codemirror/view";
import { EditorSelection, SelectionRange } from "@codemirror/state";
import { Context } from "src/utils/context";
import { setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { tabout } from "src/features/tabout";


const ALIGNMENT = " & ";
const LINE_BREAK = " \\\\\n"
const LINE_BREAK_INLINE = " \\\\ "
const END_LINE_BREAK = LINE_BREAK.trimEnd();
let addLineBreakAfterEnv = false;


const generateSeparatorChange = (separator: string, view: EditorView, range: SelectionRange): { from: number, to: number, insert: string } => {
	const d = view.state.doc;

	// Insert indents
	const fromLineText = d.lineAt(range.from).text;
	const leadingIndents = fromLineText.match(/^\s*/)[0];
	separator = separator.replaceAll("\n", `\n${leadingIndents}`);

	return { from: range.from, to: range.to, insert: separator };
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
	let env;
	for (const envName of settings.matrixShortcutsEnvNames) {
		env = { openSymbol: "\\begin{" + envName + "}", closeSymbol: "\\end{" + envName + "}" };

		isInsideAnEnv = ctx.isWithinEnvironment(ctx.pos, env);
		if (isInsideAnEnv) break;
	}

	if (!isInsideAnEnv) return false;

	if (key === "Tab" && view.state.selection.main.empty) {
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
				let d = view.state.doc;
				const envBound = ctx.getEnvironmentBound(ctx.pos, env);
				const envText = d.sliceString(envBound.start, envBound.end);

				addLineBreakAfterEnv = settings.matrixShortcutsAddLineBreakAfterEnv;

				const line = d.lineAt(ctx.pos);
				const lineNo = line.number;
				let nextLine = d.line(lineNo + 1);
				let newPos = nextLine.to;

				if (addLineBreakAfterEnv && newPos > envBound.end && !envText.trimEnd().endsWith("\\\\")) {
					setCursor(view, line.to);

					applySeparator(END_LINE_BREAK, view);

					d = view.state.doc;
					nextLine = d.line(lineNo + 1);
					newPos = nextLine.to;
				}

				setCursor(view, newPos);
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

	return false;
}
