import { EditorView } from "@codemirror/view";
import { SelectionRange } from "@codemirror/state";
import { findMatchingBracket, getOpenBracket } from "src/utils/editor_utils";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { SNIPPET_VARIABLES } from "src/snippets/snippets";
import { autoEnlargeBrackets } from "./auto_enlarge_brackets";
import { Context } from "src/utils/context";
import { getLatexSuiteConfigFromView } from "src/snippets/codemirror/config";


export const runAutoFraction = (view: EditorView, ctx: Context):boolean => {

	for (const range of ctx.ranges) {
		runAutoFractionCursor(view, ctx, range);
	}

	const success = expandSnippets(view);

	if (success) {
		autoEnlargeBrackets(view, ctx);
	}

	return success;
}


export const runAutoFractionCursor = (view: EditorView, ctx: Context, range: SelectionRange):boolean => {

	const settings = getLatexSuiteConfigFromView(view);
	const {from, to} = range;

	// Don't run autofraction in excluded environments
	for (const env of settings.parsedSettings.autofractionExcludedEnvs) {
		if (ctx.isWithinEnvironment(to, env)) {
			return false;
		}
	}

	// Get the bounds of the equation
	const result = Context.getEquationBounds(view.state);
	if (!result) return false;
	const eqnStart = result.start;


	let curLine = view.state.sliceDoc(0, to);
	let start = eqnStart;

	if (from != to) {
		// We have a selection
		// Set start to the beginning of the selection

		start = from;
	}
	else {
		// Find the contents of the fraction
		// Match everything except spaces and +-, but allow these characters in brackets

		// Also, allow spaces after greek letters
		// By replacing spaces after greek letters with a dummy character (#)

		const regex = new RegExp("(" + SNIPPET_VARIABLES["${GREEK}"] + ") ([^ ])", "g");
		curLine = curLine.replace(regex, "$1#$2");



		for (let i = curLine.length - 1; i >= eqnStart; i--) {
			const curChar = curLine.charAt(i)

			if ([")", "]", "}"].contains(curChar)) {
				const closeBracket = curChar;
				const openBracket = getOpenBracket(closeBracket);

				const j = findMatchingBracket(curLine, i, openBracket, closeBracket, true);

				if (j === -1) return false;

				// Skip to the beginnning of the bracket
				i = j;

				if (i < eqnStart) {
					start = eqnStart;
					break;
				}

			}


			if (" $([{\n".concat(settings.basicSettings.autofractionBreakingChars).contains(curChar)) {
				start = i+1;
				break;
			}
		}
	}

	// Run autofraction
	let numerator = view.state.sliceDoc(start, to);

	// Don't run on an empty line
	if (numerator === "") return false;


	// Remove brackets
	if (curLine.charAt(start) === "(" && curLine.charAt(to - 1) === ")") {
		numerator = numerator.slice(1, -1);
	}

	const replacement = `${settings.basicSettings.autofractionSymbol}{${numerator}}{$0}$1`

	queueSnippet(view, start, to, replacement, "/");

	return true;
}
