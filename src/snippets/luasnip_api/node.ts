import { VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER } from "../snippets"
import { TabstopSpec } from "../tabstop"

type Captures = {match: string[], groups: Record<string, string>}

export type Options = {
	captures: Captures,
}
export const emptyInsertOptions: Options = {
	captures: {match: [], groups: {}},
}

export type ResultInsert = {
	insert: string;
	tabstops: readonly TabstopSpec[]
}

export class BaseNode {
	constructor(
		public insert: string | ((context: Options) => string | BaseNode[]),
		public tabstops: readonly TabstopSpec[] = [],
	) {}
	

	applyInsert(options: Options): ResultInsert {
		if (typeof this.insert === "string") {
			return { insert: this.insert, tabstops: this.tabstops };
		}
		const result = this.insert(options);
		if (typeof result === "string") {
			return { insert: result, tabstops: this.tabstops };
		}

		let offset = 0;
		const tabstopResults = result
			.map((node) => node.applyInsert(options))
			.map(({ insert, tabstops }) => {
				const currentOffset = offset;
				offset += insert.length;
				return {
					insert,
					tabstops: [
						...tabstops.map((ts) => ({
							...ts,
							from: ts.from + currentOffset,
							to: ts.to + currentOffset,
						})),
						...this.tabstops.map((ts) => ({
							...ts,
							from: ts.from + currentOffset,
							to: ts.to + currentOffset,
						})),
					],
				};
			});
		const insert = tabstopResults.map((r) => r.insert).join("");
		const tabstops = tabstopResults.flatMap((r) => r.tabstops);
		return { insert, tabstops };
	}
	
}

export class TextNode extends BaseNode {
	constructor(text: string) {
		super(text);
	}
}

export class TabstopNode extends BaseNode {
	constructor(index: number, insert: string = "") {
		super(insert, [{index, from: 0, to: insert.length}]);
	}
}

export class CaptureNode extends BaseNode {
	constructor(key: number | string, defaultValue: string = "") {
		if (typeof key === "number") {
			super(({captures}) => captures.match[key] ?? defaultValue);
		} else if (typeof key === "string") {
			super(({captures}) => captures.groups[key] ?? defaultValue);
		}
	}
}

type Replacement = {
	start: number,
	end: number,
	replacement: string
}
function applyReplacements(str: string, replacements: Replacement[]): string {
	replacements.sort((a, b) => a.start - b.start);
	let offset = 0;
	const str_arr: string[] = []
	for (const {start, end, replacement} of replacements) {
		str_arr.push(str.slice(offset, start), replacement);
		offset = end;
	}
	return str_arr.join("") + str.slice(offset);
}

/**
 * @todo fix nested snippets in tabstop management as its currently broken when reversing.
 */
export class SnippetNode extends BaseNode {
	constructor(private index: number, private nodes: BaseNode[]) {
		super("", []);
	}
	
	override applyInsert(options: Options): ResultInsert {
		const result = new ArrayNode(this.nodes).applyInsert(options);
		const super_tabstop = {index: this.index, from: 0, to: result.insert.length}
		const normalizedTabstops = normalizeTabstops(result.tabstops.slice());
		const max_index = normalizedTabstops.slice(-1)[0]?.index ?? 0;
		const final_result = {
			insert: result.insert,
			tabstops: [
				super_tabstop,
				...normalizedTabstops.map((ts) => ({
					...ts,
					index: (ts.index + 1) / (max_index + 1) + this.index,
				})),
			],
		};
		return final_result
	}
}

export class SnippetStringNode extends BaseNode {
	constructor(private snippet: string) {
		super((options) => this.parseSnippet(options.captures))
	}
	
	parseSnippet(captures: Captures): BaseNode[] {
		const expandedCaptures = this.expandCaptures(captures);
		const expandedTabstops = this.expandTabstops(expandedCaptures);
		return expandedTabstops
	}
	
	expandCaptures(captures: Captures): string {
		const pattern =/\[\[(\d+)\]\]/g
		const matches = this.snippet.matchAll(pattern);
		const replacements = []
		for (const match of matches) {
			const index = parseInt(match[1]);
			if (captures.match[index] === undefined) {
				continue;
			}
			const start = match.index;
			const end = start + match[0].length;
			const replacement = captures.match[index];
			replacements.push({start, end, replacement})
		}
		return applyReplacements(this.snippet, replacements);
	}
	
	expandTabstops(snippet: string): BaseNode[] {
		const pattern = /\$(\d)|\$\{(\d+):([^}]*)\}/g;
		const matches = snippet.matchAll(pattern);
		const replacements = []
		for (const match of matches) {
			const index = parseInt(match[1] || match[2]);
			const start = match.index;
			const end = start + match[0].length;
			const replacement = match[3] || "";
			replacements.push({start, end, replacement, index})
		}
		const nodes: BaseNode[] = [];
		let offset = 0;
		for (const {start, end, replacement, index} of replacements) {
			nodes.push(new TextNode(snippet.slice(offset, start)));
			nodes.push(new TabstopNode(index, replacement));
			offset = end;
		}
		nodes.push(new TextNode(snippet.slice(offset)));
		return nodes
	}
}

export class VisualSnippetNode extends BaseNode {
	
	constructor(public snippet: string) {
		super((options) =>
			new SnippetStringNode(this.expandVisual(options.captures)).parseSnippet(
				{match: [], groups: {}},
			),
		);
	}
	
	expandVisual(captures: Captures): string {
		const pattern = VISUAL_SNIPPET_MAGIC_SELECTION_PLACEHOLDER	
		if (!captures.groups[pattern]) {
			throw new Error(`VisualSnippetNode requires the presence of a capture group named ${pattern} to indicate the position of the visual selection`);
		}
		return this.snippet.replace(pattern, captures.groups[pattern])
	}
}
export class SnippetTabstopOnlyNode extends BaseNode {
	constructor(snippet: string) {
		super(() => new SnippetStringNode(snippet).parseSnippet({match: [], groups: {}}));
	}
}

// Discourage to nest array nodes this way and a way to normalize tabstops indexes at the end.
export class ArrayNode {
	constructor(private children: BaseNode[]) {}

	applyInsert(options: Options): ResultInsert {
		const result = new BaseNode(() => this.children).applyInsert(options);
		return {
			insert: result.insert,
			tabstops: normalizeTabstops(result.tabstops.slice()),
		}
	}

}


function normalizeTabstops(tabstops: TabstopSpec[]): TabstopSpec[] {
	tabstops.sort((a, b) => a.index - b.index);
	let currentIndex = 0;
	return tabstops.map((ts, i, arr) => {
		if (i === 0) {
			currentIndex = 0;
			return { ...ts, index: currentIndex };
		} else if (ts.index === arr[i - 1].index) {
			return { ...ts, index: currentIndex };
		} else {
			currentIndex += 1;
			return { ...ts, index: currentIndex };
		}
	});
}
