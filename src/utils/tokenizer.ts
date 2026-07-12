import { Text } from "@codemirror/state";
import { SyntaxNode } from "@lezer/common";
import { PairedBrackets } from "src/editor_extensions/highlight_brackets";

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

export function findIndexReverse<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): number | null {
	for (let i = array.length - 1; i >= 0; i--) {
		if (predicate(array[i], i, array)) {
			return i;
		}
	}
	return null;
}
export function* walkPairedBrackets(tokens: PairedBrackets[], depth: number = 0): Generator<{ region: PairedBrackets; depth: number; }> {
	for (const token of tokens) {
		yield { region: token, depth };
		const newDepth = token.kind === "bracket" ? depth + 1 : depth;
		yield* walkPairedBrackets(token.children, newDepth);
	}
}

export function* iterateTreeCursor(topNode: SyntaxNode, doc: EquationText) {
	const cursor = topNode.cursor();
	if (topNode.from !== doc.from || topNode.to !== doc.to) {
		cursor.moveTo(doc.from, -1);
		while (cursor.from < doc.from && cursor.next()) {
			//
		}
	} 
	
	do {
		doc.skipCursorMove = false;
		if (cursor.to > doc.to) continue
		yield cursor;	
	} while ((doc.skipCursorMove || cursor.next()) && cursor.from <= doc.to);
}
export class EquationText {
	public skipCursorMove: boolean = false;

	constructor(
		public readonly eqn: string,
		public readonly from: number,
		public readonly to: number,
		public readonly offset: number = from
	) { }

	slice(from: number, to: number) {
		return this.eqn.slice(from - this.offset, to - this.offset);
	}
	
	static fromNode(node: SyntaxNode, doc: Text) {
		return new EquationText(doc.sliceString(node.from, node.to), node.from, node.to);
	}
}
