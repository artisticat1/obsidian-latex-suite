import { EditorView } from "@codemirror/view";
import { SelectionRange } from "@codemirror/state";
import { findMatchingBracket, getOpenBracket } from "src/utils/editor_utils";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { autoEnlargeBrackets } from "./auto_enlarge_brackets";
import { Context } from "src/utils/context";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";


export const runAutoFraction = (view: EditorView, ctx: Context):boolean => {

	for (const range of ctx.ranges) {
		runAutoFractionCursor(view, ctx, range);
	}

	const success = expandSnippets(view);

	if (success) {
		autoEnlargeBrackets(view);
	}

	return success;
}


export const runAutoFractionCursor = (view: EditorView, ctx: Context, range: SelectionRange):boolean => {

	const settings = getLatexSuiteConfig(view);
	const {from, to} = range;

	// Don't run autofraction in excluded environments
	for (const env of settings.autofractionExcludedEnvs) {
		if (ctx.isWithinEnvironment(to, env)) {
			return false;
		}
	}

	// Get the bounds of the equation
	const result = ctx.getBounds();
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

		const greek = "alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|omicron|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|Upsilon|varphi|phi|Phi|chi|psi|Psi|omega|Omega";
		const regex = new RegExp("(" + greek + ") ([^ ])", "g");
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


			if (" $([{\n".concat(settings.autofractionBreakingChars).contains(curChar)) {
				start = i+1;
				break;
			}
		}
	}

	// Don't run on an empty line
	if (start === to) { return false; }

	// Run autofraction
	let numerator = view.state.sliceDoc(start, to);

	// Remove unnecessary outer parentheses
	if (numerator.at(0) === "(" && numerator.at(-1) === ")") {
		const closing = findMatchingBracket(numerator, 0, "(", ")", false);
		if (closing === numerator.length - 1) {
			numerator = numerator.slice(1, -1);
		}
	}

	const replacement = `${settings.autofractionSymbol}{${numerator}}{$0}$1`

	queueSnippet(view, start, to, replacement, "/");

	return true;
}
