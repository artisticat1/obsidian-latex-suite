import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { CMBound, Context, getContextPlugin } from "src/utils/context";
import { autoEnlargeBrackets } from "./auto_enlarge_brackets";
import { snippetDebugLevel } from "src/settings/settings";
import { IncludedEnvironmentResult, Snippet, SnippetType } from "src/snippets/snippets";
import { showSnippetInfo } from "src/editor_extensions/obsidian_utils";
import { ResultInsert } from "src/snippets/luasnip_api/node";

type SnippetInfo = {
	snippets: Snippet<SnippetType>[];
	key?: string;
}
type RunSnippetsOptions = {
	recursive: number;
	debug: snippetDebugLevel;
}
export const runSnippets = (view: EditorView, snippetInfo: SnippetInfo, options: RunSnippetsOptions):boolean => {
	let didExpand = false;
	for (let i=0; i <= options.recursive; i++) {
		const ctx = getContextPlugin(view);
		let shouldAutoEnlargeBrackets = false;

		for (const range of ctx.ranges) {
			const result = runSnippetCursor(view, ctx, snippetInfo, {from: range.from, to: range.to}, options.debug);

			if (result.shouldAutoEnlargeBrackets) shouldAutoEnlargeBrackets = true;
		}

		const success = expandSnippets(view);
		didExpand = didExpand || success;


		if (shouldAutoEnlargeBrackets) {
			autoEnlargeBrackets(view);
		}
		if (!success) {
			break
		}
		snippetInfo.key = undefined; // only run keypress once.
	}
	return didExpand
}
const getSliceAroundCursor = (view: EditorView, to: number) => {
	const line = view.state.sliceDoc(0, to);
	let cachedLineAfter: string | null = null;
	const effectiveLineAfter = () => {
		cachedLineAfter = cachedLineAfter ?? view.state.sliceDoc(to);
		return cachedLineAfter;
	};
	return {line, effectiveLineAfter};
}

const getParsedSelection = (view: EditorView, original_range: CMBound) => {
	const parsed_range = {from: original_range.from, to: original_range.to};
	const original_sel = view.state.sliceDoc(original_range.from, original_range.to);
	let parsedSel = original_sel;
	// Remove indentations and callouts from selection as composite markers aren't really "part" of the text
	// and make more sense to be removed from the selection.
	if (original_range.from !== original_range.to) {
		parsedSel = original_sel.replaceAll(/\n>*\s*/gm, "\n")
		parsed_range.to = parsed_range.from + parsedSel.length;
		const startLine = view.state.doc.lineAt(parsed_range.from);
		if (startLine.from === parsed_range.from) {
			const match = parsedSel.match(/^>*\s*/);
			if (match) {
				parsed_range.from += match[0].length;
				parsedSel = parsedSel.replace(/^>*\s*/, "");
			}
		}	
	}
	const range = {original: original_range, parsed: parsed_range};
	const sel = {original: original_sel, parsed: parsedSel};
	return {range, sel};
}

const runSnippetCursor = (view: EditorView, ctx: Context, snippetInfo: SnippetInfo, original_range: CMBound, debug: snippetDebugLevel):{success: boolean; shouldAutoEnlargeBrackets: boolean} => {

	const settings = getLatexSuiteConfig(view);
	const {line, effectiveLineAfter} = getSliceAroundCursor(view, original_range.to);
	const to = original_range.to;
	
	const {range, sel} = getParsedSelection(view, original_range);

	const key = snippetInfo.key ?? "";
	// If the key pressed wasn't a text character, continue
	if (snippetInfo.key && snippetInfo.key.length !== 1) {
		return {success: false, shouldAutoEnlargeBrackets: false};
	}
	const envNames = Array.from(ctx.getEnvNames(to))
	const updatedLine = line + key;
	for (let i=0; i < snippetInfo.snippets.length; i++) {
		const snippet = snippetInfo.snippets[i];
		const inIncludedScope = snippet.isWithinIncludedScope(envNames);
		if (!snippet.options.snippetShouldRunInMode(ctx.mode, inIncludedScope === IncludedEnvironmentResult.Included)) {
			continue;
		}
		
		if (inIncludedScope === IncludedEnvironmentResult.NotIncluded) {
			continue;
		}	

		const result = snippet.process({effectiveLine: updatedLine, range, sel, effectiveLineAfter, view});
		if (result === null) continue;

		// Check that this snippet is not excluded in a certain environment
		if (snippet.isWithinExcludedScope(envNames)) {
			continue
		}

		const triggerPos = result.triggerPos;
		const triggerEndPos = result.triggerEndPos
			? result.triggerEndPos - key.length
			: to;

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
		const triggerKey =
			snippet.options.automatic && snippet.type !== "visual" && snippet.options.undoKey
				? key
				: undefined;
		queueSnippet(view, start, triggerEndPos, replacement, triggerKey, to);

		const containsTrigger = settings.autoEnlargeBracketsTriggers.some(word => replacement.insert.contains(word));
		if (debug === "info" || debug === "verbose") {
			showSnippetInfo(view.state, snippet, replacement.insert, containsTrigger);
		}
		if (debug === "verbose") {
			console.debug({
				snippets_unexpanded: snippetInfo.snippets
					.slice(0, i)
					.map((s) => ({
						description: s.description,
						trigger: s.trigger,
						options: s.options,
						replacement: s.replacement
					})),
				current_mode: ctx.mode,
				updatedLine,
			});	
		}	
		return {success: true, shouldAutoEnlargeBrackets: containsTrigger};
	}


	return {success: false, shouldAutoEnlargeBrackets: false};
}

const isOnWordBoundary = (state: EditorState, triggerPos: number, to: number, wordDelimiters: string) => {
	const prevChar = state.sliceDoc(triggerPos-1, triggerPos);
	const nextChar = state.sliceDoc(to, to+1);

	wordDelimiters = wordDelimiters.replace("\\n", "\n");

	return (wordDelimiters.contains(prevChar) && wordDelimiters.contains(nextChar));
}

const trimWhitespace = (replacement: ResultInsert, _ctx: Context) => {
	const tabstops = replacement.tabstops;
	replacement.insert = replacement.insert.trimEnd();
	for (const tabstop of tabstops) {
		tabstop.to = Math.min(tabstop.to, replacement.insert.length);
		tabstop.from = Math.min(tabstop.from, replacement.insert.length);
	}

	return replacement;
}
