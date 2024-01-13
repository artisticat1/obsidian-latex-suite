import { SelectionRange } from "@codemirror/state";
import { Options } from "./options";
import { Environment } from "./environment";

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

export type SnippetData<T extends SnippetType> = {
	visual: {
		trigger: string;
		replacement: string | ((selection: string) => string | false);
	};
	regex: {
		trigger: RegExp;
		replacement: string | ((match: RegExpExecArray) => string);
	};
	string: {
		trigger: string;
		replacement: string | ((match: string) => string);
	};
}[T]

export type ProcessSnippetResult =
	| { triggerPos: number, replacement: string }
	| null

/**
 * a snippet instance contains all the information necessary to run a snippet.
 * snippet data specific to a certain type of snippet is in its `data` property.
 */
export abstract class Snippet<T extends SnippetType = SnippetType> {
	type: T;
	data: SnippetData<T>;
	options: Options;
	priority?: number;
	description?: string;

	excludedEnvironments: Environment[];

	constructor(
		type: T,
		trigger: SnippetData<T>["trigger"],
		replacement: SnippetData<T>["replacement"],
		options: Options,
		priority?: number | undefined,
		description?: string | undefined,
		excludedEnvironments?: Environment[],
	) {
		this.type = type;
		// @ts-ignore
		this.data = { trigger, replacement };
		this.options = options;
		this.priority = priority;
		this.description = description;
		this.excludedEnvironments = excludedEnvironments ?? [];
	}

	// we need to explicitly type the return value here so the derived classes,
	// have the getter typed properly for the particular <T> the derived class extends
	get trigger(): SnippetData<T>["trigger"] { return this.data.trigger; }
	get replacement(): SnippetData<T>["replacement"] { return this.data.replacement; }

	abstract process(effectiveLine: string, range: SelectionRange, sel: string): ProcessSnippetResult;

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
	constructor({ trigger, replacement, options, priority, description, excludedEnvironments }: CreateSnippet<"visual">) {
		super("visual", trigger, replacement, options, priority, description, excludedEnvironments);
	}

	process(effectiveLine: string, range: SelectionRange, sel: string): ProcessSnippetResult {
		const hasSelection = !!sel;
		// visual snippets only run when there is a selection
		if (!hasSelection) { return null; }

		// check whether the trigger text was typed
		if (!(effectiveLine.endsWith(this.trigger))) { return null; }

		const triggerPos = range.from;
		let replacement;
		if (typeof this.replacement === "string") {
			replacement = this.replacement.replace(VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER, sel);
		} else {
			replacement = this.replacement(sel);

			// sanity check - if this.replacement was a function,
			// we have no way to validate beforehand that it really does return a string
			if (typeof replacement !== "string") { return null; }
		}

		return { triggerPos, replacement };
	}
}

export class RegexSnippet extends Snippet<"regex"> {

	constructor({ trigger, replacement, options, priority, description, excludedEnvironments }: CreateSnippet<"regex">) {
		super("regex", trigger, replacement, options, priority, description, excludedEnvironments);
	}

	process(effectiveLine: string, range: SelectionRange, sel: string): ProcessSnippetResult {
		const hasSelection = !!sel;
		// non-visual snippets only run when there is no selection
		if (hasSelection) { return null; }

		const result = this.trigger.exec(effectiveLine);
		if (result === null) { return null; }

		const triggerPos = result.index;

		let replacement;
		if (typeof this.replacement === "string") {
			// Compute the replacement string
			// result.length - 1 = the number of capturing groups

			const nCaptureGroups = result.length - 1;
			replacement = Array.from({ length: nCaptureGroups })
				.map((_, i) => i + 1)
				.reduce(
					(replacement, i) => replacement.replaceAll(`[[${i - 1}]]`, result[i]),
					this.replacement
				);
		} else {
			replacement = this.replacement(result);

			// sanity check - if this.replacement was a function,
			// we have no way to validate beforehand that it really does return a string
			if (typeof replacement !== "string") { return null; }
		}

		return { triggerPos, replacement };
	}
}

export class StringSnippet extends Snippet<"string"> {
	data: SnippetData<"string">;

	constructor({ trigger, replacement, options, priority, description, excludedEnvironments: excludeIn }: CreateSnippet<"string">) {
		super("string", trigger, replacement, options, priority, description, excludeIn);
	}

	process(effectiveLine: string, range: SelectionRange, sel: string): ProcessSnippetResult {
		const hasSelection = !!sel;
		// non-visual snippets only run when there is no selection
		if (hasSelection) { return null; }

		// Check whether the trigger text was typed
		if (!(effectiveLine.endsWith(this.trigger))) { return null; }

		const triggerPos = effectiveLine.length - this.trigger.length;
		const replacement = typeof this.replacement === "string"
			? this.replacement
			: this.replacement(this.trigger);

		// sanity check - if replacement was a function,
		// we have no way to validate beforehand that it really does return a string
		if (typeof replacement !== "string") { return null; }

		return { triggerPos, replacement };
	}
}

/**
 * replacer function for serializing snippets
 * @param k
 * @param v
 * @returns
 */
function replacer(k: string, v: unknown) {
	if (typeof v === "function") { return "[[Function]]"; }
	if (v instanceof RegExp) { return `[[RegExp]]: ${v.toString()}`; }
	return v;
}

type CreateSnippet<T extends SnippetType> = {
	options: Options;
	priority?: number;
	description?: string;
	excludedEnvironments?: Environment[];
} & SnippetData<T>


/**
 * serialize a snippet-like object.
 */
export function serializeSnippetLike(snippetLike: unknown) {
	return JSON.stringify(snippetLike, replacer, 2);
}