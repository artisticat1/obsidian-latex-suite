import { EditorView } from "@codemirror/view";
import { EditorState, SelectionRange } from "@codemirror/state";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { ParsedSnippet, EXCLUSIONS } from "src/snippets/snippets";
import { autoEnlargeBrackets } from "./auto_enlarge_brackets";
import { Context } from "src/utils/context";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Mode, Options } from "src/snippets/options";


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

	for (const snippet of settings.snippets) {
		let effectiveLine = view.state.sliceDoc(0, to);

		if (!snippetShouldRunInMode(snippet.options, ctx.mode)) {
			continue;
		}

		if (snippet.options.automatic || snippet.replacement.contains("${VISUAL}")) {
			// If the key pressed wasn't a text character, continue
			if (!(key.length === 1)) continue;

			effectiveLine += key;
		}
		else if (!(key === settings.snippetsTrigger)) {
			// The snippet must be triggered by a key
			continue;
		}

		// Check that this snippet is not excluded in a certain environment
		if (snippet.trigger in EXCLUSIONS) {
			const environment = EXCLUSIONS[snippet.trigger];

			if (ctx.isWithinEnvironment(to, environment)) continue;
		}


		const result = processSnippet(snippet, effectiveLine, range, sel, settings.snippetVariables);
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


const processSnippet = (snippet: ParsedSnippet, effectiveLine: string, range:  SelectionRange, sel: string, snippetVariables: {[key: string]: string}):{triggerPos: number; replacement: string} => {
	let triggerPos;
	let trigger = snippet.trigger;
	trigger = insertSnippetVariables(trigger, snippetVariables);

	let replacement = snippet.replacement;


	if (snippet.replacement.contains("${VISUAL}")) {
		// "Visual" snippets
		if (!sel) return null;

		// Check whether the trigger text was typed
		if (!(effectiveLine.slice(-trigger.length) === trigger)) return null;


		triggerPos = range.from;
		replacement = snippet.replacement.replace("${VISUAL}", sel);

	}
	else if (sel) {
		// Don't run non-visual snippets when there is a selection
		return null;
	}
	else if (!(snippet.options.regex)) {

		// Check whether the trigger text was typed
		if (!(effectiveLine.slice(-trigger.length) === trigger)) return null;

		triggerPos = effectiveLine.length - trigger.length;

	}
	else {
		// Regex snippet

		// Add $ to match the end of the string
		// i.e. look for a match at the cursor's current position
		const regex = new RegExp(trigger + "$", snippet.flags);
		const result = regex.exec(effectiveLine);

		if (!(result)) {
			return null;
		}

		// Compute the replacement string
		// result.length - 1 = the number of capturing groups

		for (let i = 1; i < result.length; i++) {
			// i-1 to start from 0
			replacement = replacement.replaceAll("[[" + (i-1) + "]]", result[i]);
		}

		triggerPos = result.index;
	}

	return {triggerPos: triggerPos, replacement: replacement};
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

const insertSnippetVariables = (trigger: string, variables: {[key: string]: string}) => {
	for (const [variable, replacement] of Object.entries(variables)) {
		trigger = trigger.replace(variable, replacement);
	}

	return trigger;
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
