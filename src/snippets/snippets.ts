import { SelectionRange } from "@codemirror/state";
import { Options } from "./options";
import { Environment } from "./environment";
import { BaseNode, ResultInsert, ArrayNode, SnippetTabstopOnlyNode, Options as InsertOptions } from "./luasnip_api/node";
import * as v from "valibot";

/**
 * in visual snippets, if the replacement is a string, this is the magic substring to indicate the selection.
 */
export const VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER = "${VISUAL}";

/**
 * there are 3 distinct types of snippets:
 *
 * `visual` snippets only trigger on text selections.
 * visual snippets support only (single-character) string triggers, and string or function replacements.
 * visual replacement functions take in the text selection and return a string, or `false` to indicate to actually not do anything.
 *
 * `regex` snippets support string (with the "r" raw option set) or regex triggers, and string or function replacements.
 * regex replacement functions take in the regex match and return a string.
 *
 * `string` snippets support string triggers (when no "r" raw option set), and string or function replacements.
 * string replacement functions take in the matched string and return a string.
 */
export type SnippetType =
	| "visual"
	| "regex"
	| "string"

const ReplacementOutputSchema = v.union([
	v.literal(false),
	v.string(),
	v.array(v.instance(BaseNode))
])
function convertOutputToNode(rawReplacement: unknown): ArrayNode | null {
	const parseResult = v.safeParse(ReplacementOutputSchema, rawReplacement);
	if (!parseResult.success) {
		console.error("Invalid replacement output:", parseResult.issues);
		return null;
	}
	if (parseResult.output === false) {
		return null;
	} else if (typeof parseResult.output === "string") { 
		const snippet = new SnippetTabstopOnlyNode(parseResult.output);
		return new ArrayNode([snippet]);
	} else if (Array.isArray(parseResult.output)){
		return new ArrayNode(parseResult.output);
	} 

	// never happens but ts can't figure that out without a return
	return parseResult.output
}

// output of replacement functions should be the output fo ReplacementOutputSchema,
// but this would lead to false confidence as user might return something else.
export type SnippetData<T extends SnippetType> = {
	visual: {
		trigger: string;
		replacement: ArrayNode | ((selection: string) => unknown);
	};
	regex: {
		trigger: RegExp;
		replacement: ArrayNode | ((match: RegExpExecArray) => unknown);
		triggerAfter?: RegExp;
	};
	string: {
		trigger: string;
		replacement: ArrayNode | ((match: string) => unknown);
		triggerAfter?: string;
	};
}[T]

export type ProcessSnippetResult =
	| { triggerPos: number, replacement: ResultInsert, triggerEndPos?: number }
	| null

/**
 * a snippet instance contains all the information necessary to run a snippet.
 * snippet data specific to a certain type of snippet is in its `data` property.
 */
export abstract class Snippet<T extends SnippetType = SnippetType> {
	type: T;
	data: SnippetData<T>;
	options: Options;
	priority: number;
	description: string;
	triggerKey: string;

	excludedEnvironments: Environment[];

	constructor(
		type: T,
		trigger: SnippetData<T>["trigger"],
		replacement: SnippetData<T>["replacement"],
		options: Options,
		priority: number = 0,
		description: string = "no description provided",
		excludedEnvironments: Environment[] = [],
		triggerKey: string = "",
	) {
		this.type = type;
		// @ts-ignore
		this.data = { trigger, replacement };
		this.options = options;
		this.priority = priority;
		this.description = description;
		this.excludedEnvironments = excludedEnvironments;
		this.triggerKey = triggerKey;
	}

	// we need to explicitly type the return value here so the derived classes,
	// have the getter typed properly for the particular <T> the derived class extends
	get trigger(): SnippetData<T>["trigger"] { return this.data.trigger; }
	get replacement(): SnippetData<T>["replacement"] { return this.data.replacement; }

	abstract process(effectiveLine: string, range: SelectionRange, sel: string, effectiveLineAfter: () => string): ProcessSnippetResult;

	toString() {
		return serializeSnippetLike({
			type: this.type,
			trigger: this.trigger,
			replacement: this.replacement,
			options: this.options,
			priority: this.priority,
			description: this.description,
			excludedEnvironments: this.excludedEnvironments,
		});
	}
}

export class VisualSnippet extends Snippet<"visual"> {
	constructor({ trigger, replacement, options, priority, description, excludedEnvironments, triggerKey }: CreateSnippet<"visual">) {
		super("visual", trigger, replacement, options, priority, description, excludedEnvironments, triggerKey);
	}

	process(effectiveLine: string, range: SelectionRange, sel: string): ProcessSnippetResult {
		const hasSelection = !!sel;
		// visual snippets only run when there is a selection
		if (!hasSelection) { return null; }

		// check whether the trigger text was typed
		if (!(effectiveLine.endsWith(this.trigger))) { return null; }

		const triggerPos = range.from;
		let replacement: ResultInsert;
		const captures = { match: [], groups: { VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER: sel} };
		const options: InsertOptions = { captures };
		if (this.replacement instanceof ArrayNode) {
			replacement = this.replacement.applyInsert(options);
		} else {
			const replacementTemp = convertOutputToNode(this.replacement(sel))

			// sanity check - if this.replacement was a function,
			// we have no way to validate beforehand that it really does returns a valid output.
			if (replacementTemp === null) { return null; }
			replacement = replacementTemp.applyInsert(options);
		}

		return { triggerPos, replacement };
	}
}

export class RegexSnippet extends Snippet<"regex"> {

	constructor({ trigger, replacement, options, priority, description, excludedEnvironments , triggerKey, triggerAfter}: CreateSnippet<"regex">) {
		super("regex", trigger, replacement, options, priority, description, excludedEnvironments, triggerKey);
		this.data.triggerAfter = triggerAfter;
	}

	process(effectiveLine: string, _range: SelectionRange, sel: string, effectiveLineAfter: () => string): ProcessSnippetResult {
		const hasSelection = !!sel;
		// non-visual snippets only run when there is no selection
		if (hasSelection) { return null; }

		const result = this.trigger.exec(effectiveLine);
		if (result === null) { return null; }
		const afterResult = this.data.triggerAfter?.exec(effectiveLineAfter());
		if (this.data.triggerAfter && afterResult === null) { return null; }
		const triggerPos = result.index;
		const triggerEndPos = afterResult
			? effectiveLine.length + afterResult[0].length
			: undefined;

		let replacement: ResultInsert;
		const options: InsertOptions = { captures: { match: result.slice(1), groups: result.groups ?? {} } };
		if (this.replacement instanceof ArrayNode) {
			// Compute the replacement string
			// result.length - 1 = the number of capturing groups
			replacement = this.replacement.applyInsert(options);
		} else {
			const replacementTemp = convertOutputToNode(this.replacement(result));

			// sanity check - if this.replacement was a function,
			// we have no way to validate beforehand that it really does return a valid output.
			if (replacementTemp === null) { return null; }
			replacement = replacementTemp.applyInsert(options);
		}

		return { triggerPos, replacement, triggerEndPos };
	}
}

export class StringSnippet extends Snippet<"string"> {
	data: SnippetData<"string">;

	constructor({ trigger, replacement, options, priority, description, excludedEnvironments: excludeIn, triggerKey, triggerAfter }: CreateSnippet<"string">) {
		super("string", trigger, replacement, options, priority, description, excludeIn, triggerKey);
		this.data.triggerAfter = triggerAfter;
	}

	process(effectiveLine: string, _range: SelectionRange, sel: string, effectiveLineAfter: () => string): ProcessSnippetResult {
		const hasSelection = !!sel;
		// non-visual snippets only run when there is no selection
		if (hasSelection) { return null; }

		// Check whether the trigger text was typed
		if (!(effectiveLine.endsWith(this.trigger))) { return null; }
		if (this.data.triggerAfter && !effectiveLineAfter().startsWith(this.data.triggerAfter)) { return null; }

		const triggerPos = effectiveLine.length - this.trigger.length;
		const triggerEndPos = this.data.triggerAfter !== undefined
			? effectiveLine.length + this.data.triggerAfter.length
			: undefined;
		const replacement = this.replacement instanceof ArrayNode
			? this.replacement.applyInsert({ captures: { match: [], groups: {} } })
			: {insert: this.replacement(this.trigger), tabstops: []}

		// sanity check - if replacement was a function,
		// we have no way to validate beforehand that it really does return a string
		const {insert, tabstops} = replacement;
		if (typeof insert !== "string") { return null; }

		const verifiedReplacement: ResultInsert = { insert, tabstops };
		return { triggerPos, replacement: verifiedReplacement, triggerEndPos };
	}
}

/**
 * replacer function for serializing snippets
 * @param k
 * @param v
 * @returns
 */
function replacer(_k: string, v: unknown) {
	if (typeof v === "function") { return "[[Function]]"; }
	if (v instanceof RegExp) { return `[[RegExp]]: ${v.toString()}`; }
	return v;
}

type CreateSnippet<T extends SnippetType> = {
	options: Options;
	priority?: number;
	description?: string;
	excludedEnvironments?: Environment[];
	triggerKey?: string;
} & SnippetData<T>


/**
 * serialize a snippet-like object.
 */
export function serializeSnippetLike(snippetLike: unknown) {
	return JSON.stringify(snippetLike, replacer, 2);
}
