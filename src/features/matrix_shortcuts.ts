import { ChangeSet, EditorSelection, SelectionRange, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tabout } from "src/features/tabout";
import { LatexSuiteCMSettings } from "src/settings/settings"
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Context } from "src/utils/context";
import { setCursor, replaceRange } from "src/utils/editor_utils";


const ALIGNMENT = " & ";
const LINE_BREAK = " \\\\\n"
const LINE_BREAK_INLINE = " \\\\ "
const FINAL_LINE_BREAK = LINE_BREAK.trimEnd();


const isLineBreak = (separator: string) => {
	return separator.contains("\\\\");
}


const isMultiLineBreak = (separator: string): boolean => {
	return separator.contains("\\\\") && separator.contains("\n");
}


const endsWithHline = (line: string): boolean => {
	return line.trimEnd().endsWith("\\hline");
}


const generateSeparatorChange = (doc: Text, range: SelectionRange, separator: string, settings: LatexSuiteCMSettings): { from: number, to: number, insert: string } => {
	const isWhitespaceTrimEnabled = settings.matrixShortcutsWhitespaceTrimEnabled;
	const isHlineLineBreakEnabled = settings.matrixShortcutsHlineLineBreakEnabled;
	const isAlignmentTrimEnabled = settings.matrixShortcutsAlignmentTrimEnabled;

	const fromLine = doc.lineAt(range.from);
	const textBeforeFrom = doc.sliceString(fromLine.from, range.from).trimStart();  // Preserve indents

	const toLine = doc.lineAt(range.to);
	const textAfterTo = doc.sliceString(range.to, toLine.to);

	let { from, to } = range;

	if (!isHlineLineBreakEnabled && isMultiLineBreak(separator) && endsWithHline(textBeforeFrom)) {
		separator = "\n";
	}

	if (isWhitespaceTrimEnabled) {
		// If at the beginning of the line
		if (textBeforeFrom === "") {
			separator = separator.match(/^[ \t]*([\s\S]*)$/)[1];
		}

		// Extend selection to include trailing whitespace before `from`
		if (isAlignmentTrimEnabled && isLineBreak(separator)) {
			from -= textBeforeFrom.match(/\s*&?\s*$/)[0].length;
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


const applySeparator = (view: EditorView, separator: string) => {
	const doc = view.state.doc
	const settings = getLatexSuiteConfig(view);

	const transaction = view.state.changeByRange(range => {
		const change = generateSeparatorChange(doc, range, separator, settings);
		const changeSet = ChangeSet.of([change], doc.length)
		const newRangePos = changeSet.mapPos(change.from) + change.insert.length;
		return {
			changes: change,
			range: EditorSelection.cursor(newRangePos)
		};
	})

	view.dispatch(transaction);
}


export const runMatrixShortcuts = (view: EditorView, ctx: Context, key: string, shiftKey: boolean): boolean => {
	const settings = getLatexSuiteConfig(view);

	// Check whether we are inside a matrix / align / case environment
	let isInsideAnEnv = false;
	let envBound;
	for (const envName of settings.matrixShortcutsEnvNames) {
		const env = { openSymbol: "\\begin{" + envName + "}", closeSymbol: "\\end{" + envName + "}" };

		envBound = ctx.getEnvironmentBound(ctx.pos, env);

		isInsideAnEnv = (envBound !== null)

		if (isInsideAnEnv) break;
	}

	if (!isInsideAnEnv) return false;

	if (key === "Tab" && view.state.selection.main.empty) {
		applySeparator(view, ALIGNMENT);

		return true;
	}

	else if (key === "Enter") {
		if (shiftKey) {
			if (ctx.mode.inlineMath) {
				return tabout(view, ctx);
			}

			const isEmptyLineTrimAfterEnvEnabled = settings.matrixShortcutsEmptyLineTrimAfterEnvEnabled;
			const isLineBreakAfterEnvEnabled = settings.matrixShortcutsLineBreakAfterEnvEnabled;

			// Move cursor to end of next line
			let d = view.state.doc;
			const envText = d.sliceString(envBound.start, envBound.end);

			let line = d.lineAt(ctx.pos);
			let lineNo = line.number;
			let nextLine = d.line(lineNo + 1);
			let newPos = nextLine.to;

			if (newPos <= envBound.end) {
				setCursor(view, newPos);

				return true;
			}

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

				applySeparator(view, FINAL_LINE_BREAK);

				d = view.state.doc;
				nextLine = d.line(lineNo + 1);
				newPos = nextLine.to;
			}

			setCursor(view, newPos);

			return true;
		}
		else {
			if (ctx.mode.inlineMath) {
				applySeparator(view, LINE_BREAK_INLINE);
			}
			else {
				applySeparator(view, LINE_BREAK);
			}

			return true;
		}
	}

	return false;
}
