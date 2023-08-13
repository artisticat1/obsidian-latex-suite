import { SelectionRange } from "@codemirror/state";
import { isWithinInlineEquation } from "src/editor_helpers";
import { queueSnippet } from "src/snippets/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { ParsedSnippet, SNIPPET_VARIABLES, EXCLUSIONS } from "src/snippets/snippets";
import { autoEnlargeBrackets } from "./auto_enlarge_brackets";
import { Options } from "src/snippets/options";
import { Context } from "src/snippets/context";
import { getLatexSuiteConfigFromView } from "src/snippets/config";


export const runSnippets = (ctx: Context, key: string):boolean => {

	let shouldAutoEnlargeBrackets = false;

	for (const range of ctx.ranges) {
		const result = runSnippetCursor(ctx, key, range);

		if (result.shouldAutoEnlargeBrackets) shouldAutoEnlargeBrackets = true;
	}

	const success = expandSnippets(ctx.view);


	if (shouldAutoEnlargeBrackets) {
		autoEnlargeBrackets(ctx);
	}

	return success;
}


export const runSnippetCursor = (ctx: Context, key: string, range: SelectionRange):{success: boolean; shouldAutoEnlargeBrackets: boolean} => {

	const settings = getLatexSuiteConfigFromView(ctx.view);
	const {from, to} = range;
	const sel = ctx.view.state.sliceDoc(from, to);

	for (const snippet of settings.snippets) {
		let effectiveLine = ctx.view.state.sliceDoc(0, to);

		if (!ctx.mode.overlaps(snippet.options.mode)) {
			continue;
		}

		if (snippet.options.automatic || snippet.replacement.contains("${VISUAL}")) {
			// If the key pressed wasn't a text character, continue
			if (!(key.length === 1)) continue;

			effectiveLine += key;
		}
		else if (!(key === settings.basicSettings.snippetsTrigger)) {
			// The snippet must be triggered by a key
			continue;
		}

		// Check that this snippet is not excluded in a certain environment
		if (snippet.trigger in EXCLUSIONS) {
			const environment = EXCLUSIONS[snippet.trigger];

			if (ctx.isInsideEnvironment(to, environment)) continue;
		}


		const result = checkSnippet(snippet, snippet.options, effectiveLine, range, sel);
		if (result === null) continue;
		const triggerPos = result.triggerPos;


		if (snippet.options.onWordBoundary) {
			// Check that the trigger is preceded and followed by a word delimiter

			const prevChar = ctx.view.state.sliceDoc(triggerPos-1, triggerPos);
			const nextChar = ctx.view.state.sliceDoc(to, to+1);

			const wordDelimiters = settings.basicSettings.wordDelimiters.replace("\\n", "\n");


			const prevCharIsWordDelimiter = wordDelimiters.contains(prevChar);
			const nextCharIsWordDelimiter = wordDelimiters.contains(nextChar);

			if (!(prevCharIsWordDelimiter && nextCharIsWordDelimiter)) {
				continue;
			}
		}

		let replacement = result.replacement;


		// When in inline math, remove any spaces at the end of the replacement
		if (ctx.mode.anyMath() && settings.basicSettings.removeSnippetWhitespace) {
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

				const inlineMath = isWithinInlineEquation(ctx.view.state);

				if (inlineMath) {
					if (spaceIndex === -1) {
						replacement = replacement.trimEnd();
					}
					else if (spaceIndex === -3){
						replacement = replacement.slice(0, -3) + replacement.slice(-2)
					}
				}
			}

		}

		// Expand the snippet
		const start = triggerPos;
		queueSnippet(ctx.view, {from: start, to: to, insert: replacement, keyPressed: key});


		const containsTrigger = settings.parsedSettings.autoEnlargeBracketsTriggers.some(word => replacement.contains("\\" + word));
		return {success: true, shouldAutoEnlargeBrackets: containsTrigger};
	}


	return {success: false, shouldAutoEnlargeBrackets: false};
}


export const checkSnippet = (snippet: ParsedSnippet, options: Options, effectiveLine: string, range:  SelectionRange, sel: string):{triggerPos: number; replacement: string} => {
	let triggerPos;
	let trigger = snippet.trigger;
	trigger = insertSnippetVariables(trigger);

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
	else if (!(options.regex)) {

		// Check whether the trigger text was typed
		if (!(effectiveLine.slice(-trigger.length) === trigger)) return null;

		triggerPos = effectiveLine.length - trigger.length;

	}
	else {
		// Regex snippet

		// Add $ to match the end of the string
		// i.e. look for a match at the cursor's current position
		const regex = new RegExp(trigger + "$");
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


export const insertSnippetVariables = (trigger: string) => {

	for (const [variable, replacement] of Object.entries(SNIPPET_VARIABLES)) {
		trigger = trigger.replace(variable, replacement);
	}

	return trigger;
}
