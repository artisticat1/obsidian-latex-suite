import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

export interface Token {
	readonly start: number;
	readonly end: number;
	readonly text: string;
}


export const tokenize = (latexString: string): Token[] => {
	const tokens: Token[] = [];
	let index = 0;

	while (index < latexString.length) {
		const char = latexString[index];

		if (/\s/.test(char)) {
			index++;
			continue;
		}

		const { token, nextIndex } = readNextToken(latexString, index);
		tokens.push(token);
		index = nextIndex;
	}

	return tokens;
};


const readNextToken = (latexString: string, start: number): { token: Token; nextIndex: number } => {
	const char = latexString[start];

	switch (char) {
		case "%":
			return readCommentToken(latexString, start);
		case "\\":
			return readEscapeToken(latexString, start);
		default:
			return readSingleCharacterToken(latexString, start);
	}
};


const readCommentToken = (latexString: string, start: number): { token: Token; nextIndex: number } => {
	const length = latexString.length;
	let current = start + 1;

	while (current < length && latexString[current] !== "\n") {
		current++;
	}

	const token: Token = {
		start,
		end: current,
		text: latexString.slice(start, current),
	};

	return { token, nextIndex: current };
};


const readEscapeToken = (latexString: string, start: number): { token: Token; nextIndex: number } => {
	const length = latexString.length;
	let current = start + 1;

	const nextChar = latexString[current];

	// Case: Command token (e.g., \sin, \frac)
	if (/[A-Za-z]/.test(nextChar)) {
		do {
			current++;
		} while (current < length && /[A-Za-z]/.test(latexString[current]));
	}
	// Case: Symbol token (e.g., \%, \_, \{)
	else {
		current++;
	}

	const token: Token = {
		start,
		end: current,
		text: latexString.slice(start, current),
	};

	return { token, nextIndex: current };
};


const readSingleCharacterToken = (latexString: string, start: number): { token: Token; nextIndex: number } => {
	const end = start + 1;

	const token: Token = {
		start,
		end,
		text: latexString.slice(start, end),
	};

	return { token, nextIndex: end };
};

type OpenRegion<T> = {outer_start: number, inner_start: number, open: T}
type CloseRegion<U> = {outer_end: number, inner_end: number, close: U}

export function tokenize_brackets<T extends string, U extends string>(
	text: string,
	brackets: ReadonlyArray<readonly [T, U]>,
	state: EditorState,
	pos: number,
	start = 0,
	end: number = text.length,
) {
	const tree = syntaxTree(state);
	const comments: { from: number; to: number }[] = [];
	tree.iterate({
		from: pos + start,
		to: pos + end,
		enter(node) {
			if (node.name === "comment_math") {
				comments.push({ from: node.from, to: node.to });
			}
		},
	});

	const stored_brackets: {
		open: string;
		start: number;
		region: Region<T, U>;
	}[] = [];
	const regions: Region<T, U>[] = [];
	let current_region: Region<T, U> | null = null;
	let current_node_index = 0;
	outer_loop: for (let i = start; i < end; i++) {
		const comment = comments[current_node_index];
		if (comment && comment.from <= pos + i && comment.to > pos + i) {
			i = comment.to - pos - 1;
			current_node_index++;
			continue;
		}
		for (const [open, close] of brackets) {
			if (text.startsWith(open, i)) {
				const region: Region<T, U> = {
					inner_start: i + open.length,
					outer_start: i,
					open,
					kind: "error_open",
					children: [],
					parent: current_region ?? null,
				};
				stored_brackets.push({ open, start: i, region });
				current_region?.children.push(region);
				if (!current_region) {
					regions.push(region);
				}

				current_region = region;
				i += open.length - 1;
				continue outer_loop;
			} else if (text.startsWith(close, i)) {
				const open_match_index = findIndexReverse(
					stored_brackets,
					(b) => b.open === open,
				);
				if (open_match_index === null) {
					const children = current_region?.children ?? regions;
					children.push({
						inner_end: i,
						outer_end: i + close.length,
						close,
						kind: "error_close",
						children: [],
						parent: current_region,
					});
					i += close.length - 1;
					continue outer_loop;
				}
				const open_match = stored_brackets[open_match_index];
				stored_brackets.splice(
					open_match_index,
					stored_brackets.length - open_match_index,
				);
				const region = open_match.region;
				current_region = region.parent;
				Object.assign(region, {
					kind: "bracket",
					inner_end: i,
					outer_end: i + close.length,
					close,
				});

				i += close.length - 1;
				continue outer_loop;
			}
		}
	}
	return regions;
}


export type Region<T, U> = (
	| (OpenRegion<T> & CloseRegion<U> & { kind: "bracket" })
	| (OpenRegion<T> & { kind: "error_open" })
	| (CloseRegion<U> & { kind: "error_close" })
) & {
	children: Region<T, U>[];
	parent: Region<T, U> | null;
};

export function findIndexReverse<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): number | null {
	for (let i = array.length - 1; i >= 0; i--) {
		if (predicate(array[i], i, array)) {
			return i;
		}
	}
	return null;
}


export function* walkTokens<T,U>(tokens: Region<T,U>[]): Generator<{region: Region<T,U>, depth: number}> {
	function* walkTokensInner(tokens: Region<T,U>[], currentDepth: number): Generator<{region: Region<T,U>, depth: number}> {
		for (const token of tokens) {
			yield {region: token, depth: currentDepth};
			yield* walkTokensInner(token.children, currentDepth + 1);
		}
	}
	yield* walkTokensInner(tokens, 0);
}
