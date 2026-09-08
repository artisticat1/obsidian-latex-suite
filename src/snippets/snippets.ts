import { Options } from "./options";
import { BaseNode, ResultInsert, ArrayNode, SnippetTabstopOnlyNode, Options as InsertOptions } from "./luasnip_api/node";
import * as v from "valibot";
import { MacroArea } from "src/editor_context/default_text_areas";
import { CMBound, StackOutput, isMacroArgumentCount } from "src/editor_context/context";
import { EditorView } from "@codemirror/view";

/**
 * in visual snippets, if the replacement is a string, this is the magic substring to indicate the selection.
 */
export const VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER = "${VISUAL}";
/**
 * Similar to ${VISUAL}, but refers to the original selection before any processing.
 * can only be accessed through basenodes. Has the callouts and indentation preserved.
 */
const VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER_ORIGINAL = "${VISUAL_ORIGINAL}";

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

type SnippetReplacementUnstableApi = {
	view: EditorView
	options: InsertOptions
}

// output of replacement functions should be the output fo ReplacementOutputSchema,
// but this would lead to false confidence as user might return something else.
export type SnippetData<T extends SnippetType> = {
	visual: {
		trigger: string;
		replacement: ArrayNode | ((selection: string, api: SnippetReplacementUnstableApi) => unknown);
	};
	regex: {
		trigger: RegExp;
		replacement: ArrayNode | ((match: RegExpExecArray, api: SnippetReplacementUnstableApi) => unknown);
		triggerAfter?: RegExp;
	};
	string: {
		trigger: string;
		replacement: ArrayNode | ((match: string, api: SnippetReplacementUnstableApi) => unknown);
		triggerAfter?: string;
	};
}[T]

export type ProcessSnippetResult =
	| { triggerPos: number, replacement: ResultInsert, triggerEndPos?: number }
	| null

export enum IncludedEnvironmentResult {
	None,
	Included,
	NotIncluded
}

type ProccesArgs = {
	effectiveLine: string;
	range: {
		original: CMBound;
		parsed: CMBound;
	};
	sel: {
		original: string;
		parsed: string;
	};
	effectiveLineAfter: () => string;
	view: EditorView
}

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

	excludedEnvironments: string[];
	excludedMacros: MacroArea[] = [];
	includedMacros: MacroArea[] = [];

	constructor(
		type: T,
		trigger: SnippetData<T>["trigger"],
		replacement: SnippetData<T>["replacement"],
		options: Options,
		priority: number = 0,
		description: string = "no description provided",
		excludedEnvironments: string[] = [],
		excludedMacros: MacroArea[] = [],
		includedMacros: MacroArea[] = [],
		triggerKey: string = "",
	) {
		this.type = type;
		// @ts-ignore
		this.data = { trigger, replacement };
		this.options = options;
		this.priority = priority;
		this.description = description;
		this.excludedEnvironments = excludedEnvironments;
		this.excludedMacros = excludedMacros;
		this.includedMacros = includedMacros;
		this.triggerKey = triggerKey;
	}

	// we need to explicitly type the return value here so the derived classes,
	// have the getter typed properly for the particular <T> the derived class extends
	get trigger(): SnippetData<T>["trigger"] { return this.data.trigger; }
	get replacement(): SnippetData<T>["replacement"] { return this.data.replacement; }

	abstract process(args: ProccesArgs): ProcessSnippetResult;

	isWithinExcludedScope(stack: StackOutput[]): boolean {
		if (this.excludedEnvironments.length === 0 && this.excludedMacros.length === 0) return false;
		for (const envName of stack) {
			if (envName.kind === "environment") {
				if (this.excludedEnvironments.includes(envName.name)) return true;
				// An environment does not end the enclosing macro's scope: \begin{align} inside \ce{}
				// is still mhchem syntax, so keep walking outward to check excludedMacros.
				continue;
			} else if (envName.kind === "math") {
				return false;
			} else if (isMacroArgumentCount(envName, this.excludedMacros)) {
				return true;
			}
		}
		return false;
	}

	isWithinIncludedScope(stack: StackOutput[]): IncludedEnvironmentResult {
		if (this.includedMacros.length === 0) return IncludedEnvironmentResult.None;
		// Environments are skipped for the same reason as in isWithinExcludedScope, but only the
		// innermost macro is considered: an included macro further out does not re-enable snippets.
		const firstName = stack.find((envName) => envName.kind !== "environment");
		if (firstName === undefined || firstName.kind === "math")
			return IncludedEnvironmentResult.NotIncluded;
		if (isMacroArgumentCount(firstName, this.includedMacros))
			return IncludedEnvironmentResult.Included;
		return IncludedEnvironmentResult.NotIncluded;
	}

	toString() {
		return serializeSnippetLike({
			type: this.type,
			trigger: this.trigger,
			replacement: this.replacement,
			options: this.options,
			priority: this.priority,
			description: this.description,
			excludedEnvironments: this.excludedEnvironments,
			excludedMacros: this.excludedMacros,
		});
	}
}

export class VisualSnippet extends Snippet<"visual"> {
	constructor({ trigger, replacement, options, priority, description, excludedEnvironments, excludedMacros, includedMacros, triggerKey }: CreateSnippet<"visual">) {
		super("visual", trigger, replacement, options, priority, description, excludedEnvironments, excludedMacros, includedMacros, triggerKey);
	}

	process({effectiveLine, range, sel, view}: ProccesArgs): ProcessSnippetResult {
		const hasSelection = !!sel.original;
		// visual snippets only run when there is a selection
		if (!hasSelection) { return null; }

		// check whether the trigger text was typed
		if (!(effectiveLine.endsWith(this.trigger))) { return null; }

		let triggerPos = range.original.from;
		let replacement: ResultInsert;
		const captures = {
			match: [],
			groups: {
				[VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER]: sel.parsed,
				[VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER_ORIGINAL]: sel.original,
			},
		};
		const options: InsertOptions = { captures };
		if (this.replacement instanceof ArrayNode) {
			replacement = this.replacement.applyInsert(options);
		} else {
			const replacementOptions = {
				view, options
			}
			const replacementTemp = convertOutputToNode(this.replacement(sel.parsed, replacementOptions))

			// sanity check - if this.replacement was a function,
			// we have no way to validate beforehand that it really does returns a valid output.
			if (replacementTemp === null) { return null; }
			replacement = replacementTemp.applyInsert(options);
		}
		if (replacement.tabstops.length === 0) {
			const startDifference = range.parsed.from - range.original.from;
			replacement.insert = sel.original.slice(0, startDifference) + replacement.insert;
			replacement.tabstops = [{ from: 0, to: replacement.insert.length, index: [0] }];
		}

		return { triggerPos, replacement };
	}
}

export class RegexSnippet extends Snippet<"regex"> {

	constructor({ trigger, replacement, options, priority, description, excludedEnvironments, excludedMacros, includedMacros, triggerKey, triggerAfter}: CreateSnippet<"regex">) {
		super("regex", trigger, replacement, options, priority, description, excludedEnvironments, excludedMacros, includedMacros, triggerKey);
		this.data.triggerAfter = triggerAfter;
	}

	process({effectiveLine, sel, effectiveLineAfter, view}: ProccesArgs): ProcessSnippetResult {
		const hasSelection = !!sel.original;
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
			const replacementOptions = {
				view,
				options
			};
			const replacementTemp = convertOutputToNode(this.replacement(result, replacementOptions));

			// sanity check - if this.replacement was a function,
			// we have no way to validate beforehand that it really does return a valid output.
			if (replacementTemp === null) { return null; }
			replacement = replacementTemp.applyInsert(options);
		}

		return { triggerPos, replacement, triggerEndPos };
	}
}

export class StringSnippet extends Snippet<"string"> {

	constructor({ trigger, replacement, options, priority, description, excludedEnvironments: excludeIn, excludedMacros, includedMacros, triggerKey, triggerAfter }: CreateSnippet<"string">) {
		super("string", trigger, replacement, options, priority, description, excludeIn, excludedMacros, includedMacros, triggerKey);
		this.data.triggerAfter = triggerAfter;
	}

	process({effectiveLine, sel, effectiveLineAfter, view}: ProccesArgs): ProcessSnippetResult {
		const hasSelection = !!sel.original;
		// non-visual snippets only run when there is no selection
		if (hasSelection) { return null; }

		// Check whether the trigger text was typed
		if (!(effectiveLine.endsWith(this.trigger))) { return null; }
		if (this.data.triggerAfter && !effectiveLineAfter().startsWith(this.data.triggerAfter)) { return null; }

		const triggerPos = effectiveLine.length - this.trigger.length;
		const triggerEndPos = this.data.triggerAfter !== undefined
			? effectiveLine.length + this.data.triggerAfter.length
			: undefined;
		const options: InsertOptions = { captures: { match: [this.trigger], groups: {} } };
		let replacement: ResultInsert;
		if (this.replacement instanceof ArrayNode) {
			replacement = this.replacement.applyInsert(options)
		} else {
			const replacementOptions = {
				view,
				options
			};
			const replacementTemp = convertOutputToNode(this.replacement(this.trigger, replacementOptions))

			// sanity check - if replacement was a function,
			// we have no way to validate beforehand that it really does return a string
			if (replacementTemp === null) { return null; }
			replacement = replacementTemp.applyInsert(options)
		}

		return { triggerPos, replacement, triggerEndPos };
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
	excludedEnvironments?: string[];
	excludedMacros?: MacroArea[];
	includedMacros?: MacroArea[];
	triggerKey?: string;
} & SnippetData<T>


/**
 * serialize a snippet-like object.
 */
export function serializeSnippetLike(snippetLike: unknown) {
	return JSON.stringify(snippetLike, replacer, 2);
}
