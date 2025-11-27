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
		case '%':
			return readCommentToken(latexString, start);
		case '\\':
			return readEscapeToken(latexString, start);
		default:
			return readSingleCharacterToken(latexString, start);
	}
};


const readCommentToken = (latexString: string, start: number): { token: Token; nextIndex: number } => {
	const length = latexString.length;
	let current = start + 1;

	while (current < length && latexString[current] !== '\n') {
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

	// Edge case: latexString ends with a single backslash
	if (current >= length) {
		const token: Token = {
			start,
			end: current,
			text: latexString.slice(start, current),
		};
		return { token, nextIndex: current };
	}

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
