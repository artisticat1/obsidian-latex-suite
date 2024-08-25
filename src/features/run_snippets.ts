import { EditorView } from "@codemirror/view";
import { EditorState, SelectionRange } from "@codemirror/state";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { Mode, Options } from "src/snippets/options";
import { expandSnippets } from "src/snippets/snippet_management";
import { Context } from "src/utils/context";
import { autoEnlargeBrackets } from "./auto_enlarge_brackets";


export const runSnippets = (view: EditorView, ctx: Context, key: string):boolean => {

	let shouldAutoEnlargeBrackets = false;

	for (const range of ctx.ranges) {
		const result = runSnippetCursor(view, ctx, key, range);

		if (result.shouldAutoEnlargeBrackets) shouldAutoEnlargeBrackets = true;
	}

	const success = expandSnippets(view);


	if (shouldAutoEnlargeBrackets) {
		autoEnlargeBrackets(view);
	}

	return success;
}


const runSnippetCursor = (view: EditorView, ctx: Context, key: string, range: SelectionRange):{success: boolean; shouldAutoEnlargeBrackets: boolean} => {

	const settings = getLatexSuiteConfig(view);
	const {from, to} = range;
	const sel = view.state.sliceDoc(from, to);
	const line = view.state.sliceDoc(0, to);
	const updatedLine = line + key;
	for (const snippet of settings.snippets) {
		let effectiveLine = line;

		if (!snippetShouldRunInMode(snippet.options, ctx.mode)) {
			continue;
		}

		if (snippet.options.automatic || snippet.type === "visual") {
			// If the key pressed wasn't a text character, continue
			if (!(key.length === 1)) continue;
			effectiveLine = updatedLine;
		}
		else if (!(key === settings.snippetsTrigger)) {
			// The snippet must be triggered by a key
			continue;
		}

		// Check that this snippet is not excluded in a certain environment
		let isExcluded = false;
		// in practice, a snippet should have very few excluded environments, if any,
		// so the cost of this check shouldn't be very high
		for (const environment of snippet.excludedEnvironments) {
			if (ctx.isWithinEnvironment(to, environment)) { isExcluded = true; }
		}
		// we could've used a labelled outer for loop to `continue` from within the inner for loop,
		// but labels are extremely rarely used, so we do this construction instead
		if (isExcluded) { continue; }

		const result = snippet.process(effectiveLine, range, sel);
		if (result === null) continue;
		const triggerPos = result.triggerPos;

		if (snippet.options.onWordBoundary) {
			// Check that the trigger is preceded and followed by a word delimiter
			if (!isOnWordBoundary(view.state, triggerPos, to, settings.wordDelimiters)) continue;
		}

		let replacement = result.replacement;

		// When in inline math, remove any spaces at the end of the replacement
		if (ctx.mode.inlineMath && settings.removeSnippetWhitespace) {
			replacement = trimWhitespace(replacement, ctx);
		}

		// Expand the snippet
		const start = triggerPos;
		queueSnippet(view, start, to, replacement, key);

		const containsTrigger = settings.autoEnlargeBracketsTriggers.some(word => replacement.contains("\\" + word));
		return {success: true, shouldAutoEnlargeBrackets: containsTrigger};
	}


	return {success: false, shouldAutoEnlargeBrackets: false};
}

const snippetShouldRunInMode = (options: Options, mode: Mode) => {
	if (
		options.mode.inlineMath && mode.inlineMath ||
		options.mode.blockMath && mode.blockMath ||
		(options.mode.inlineMath || options.mode.blockMath) && mode.codeMath
	) {
		if (!mode.textEnv) {
			return true;
		}
	}

	if (mode.inMath() && mode.textEnv && options.mode.text) {
		return true;
	}

	if (options.mode.text && mode.text ||
		options.mode.code && mode.code
	) {
		return true;
	}
}

const isOnWordBoundary = (state: EditorState, triggerPos: number, to: number, wordDelimiters: string) => {
	const prevChar = state.sliceDoc(triggerPos-1, triggerPos);
	const nextChar = state.sliceDoc(to, to+1);

	wordDelimiters = wordDelimiters.replace("\\n", "\n");

	return (wordDelimiters.contains(prevChar) && wordDelimiters.contains(nextChar));
}

const trimWhitespace = (replacement: string, ctx: Context) => {
	let spaceIndex = 0;

	if (replacement.endsWith(" ")) {
		spaceIndex = -1;
	}
	else {
		const lastThreeChars = replacement.slice(-3);
		const lastChar = lastThreeChars.slice(-1);

		if (lastThreeChars.slice(0, 2) === " $" && !isNaN(parseInt(lastChar))) {
			spaceIndex = -3;
		}
	}

	if (spaceIndex != 0) {
		if (spaceIndex === -1) {
			replacement = replacement.trimEnd();
		}
		else if (spaceIndex === -3){
			replacement = replacement.slice(0, -3) + replacement.slice(-2);
		}
	}

	return replacement;
}