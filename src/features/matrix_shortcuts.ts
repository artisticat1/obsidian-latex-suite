import { EditorView } from "@codemirror/view";
import { EditorSelection, SelectionRange } from "@codemirror/state";
import { Context } from "src/utils/context";
import { setCursor, replaceRange } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { tabout } from "src/features/tabout";


const ALIGNMENT = " & ";
const LINE_BREAK = " \\\\\n"
const LINE_BREAK_INLINE = " \\\\ "
const END_LINE_BREAK = LINE_BREAK.trimEnd();


const isLineBreak = (separator: string) => {
	return separator.contains("\\\\");
}


const isMultiLineBreak = (separator: string): boolean => {
	return separator.contains("\\\\") && separator.contains("\n");
}


const isHline = (line: string): boolean => {
	return line.trimEnd().endsWith("\\hline");
}


const generateSeparatorChange = (separator: string, view: EditorView, range: SelectionRange): { from: number, to: number, insert: string } => {
	const settings = getLatexSuiteConfig(view);
	const isWhitespaceTrimEnabled  = settings.matrixShortcutsWhitespaceTrimEnabled;
	const isHlineLineBreakEnabled = settings.matrixShortcutsHlineLineBreakEnabled;
	const isAlignmentTrimEnabled  = settings.matrixShortcutsAlignmentTrimEnabled;

	const d = view.state.doc;

	const fromLine = d.lineAt(range.from);
	const textBeforeFrom = d.sliceString(fromLine.from, range.from).trimStart();  // Preserve indents

	const toLine = d.lineAt(range.from);
	const textAfterTo = d.sliceString(range.to, toLine.to);

	let { from, to } = range;

	if (!isHlineLineBreakEnabled && isMultiLineBreak(separator) && isHline(textBeforeFrom)) {
		separator = "\n";
	}

	if (isWhitespaceTrimEnabled ) {
		// If at the beginning of the line
		if (textBeforeFrom === "") {
			separator = separator.match(/^[ \t]*([\s\S]*)$/)[1];
		}

		// Extend selection to include trailing whitespace before `from`
		if (isAlignmentTrimEnabled  && isLineBreak(separator)) {
			from -= textBeforeFrom.match(/\s*\&?\s*$/)[0].length;
		}
		else {
			from -= textBeforeFrom.match(/\s*$/)[0].length;
		}
		to += textAfterTo.match(/^\s*/)[0].length;  // Extend selection to include leading whitespace after `to`
	}

	// Insert indents
	const leadingIndents = fromLine.text.match(/^\s*/)[0];
	separator = separator.replaceAll("\n", `\n${leadingIndents}`);

	return { from: from, to: to, insert: separator };
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
				const isEmptyLineTrimAfterEnvEnabled = settings.matrixShortcutsEmptyLineTrimAfterEnvEnabled;
				const isLineBreakAfterEnvEnabled = settings.matrixShortcutsLineBreakAfterEnvEnabled;

				// Move cursor to end of next line
				let d = view.state.doc;
				const envBound = ctx.getEnvironmentBound(ctx.pos, env);
				const envText = d.sliceString(envBound.start, envBound.end);

				let line = d.lineAt(ctx.pos);
				let lineNo = line.number;
				let nextLine = d.line(lineNo + 1);
				let newPos = nextLine.to;

				if (newPos > envBound.end) {
					if (isEmptyLineTrimAfterEnvEnabled && line.text.trim() === "") {
						replaceRange(view, line.from, nextLine.from, "");

						d = view.state.doc;
						lineNo--;
						line = d.line(lineNo);
						nextLine = d.line(lineNo + 1);
						newPos = nextLine.to;
					}

					if (isLineBreakAfterEnvEnabled && !envText.trimEnd().endsWith("\\\\")) {
						setCursor(view, line.to);

						applySeparator(END_LINE_BREAK, view);

						d = view.state.doc;
						nextLine = d.line(lineNo + 1);
						newPos = nextLine.to;
					}
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
