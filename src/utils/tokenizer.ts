export interface Token {
	readonly start: number;
	readonly end: number;
	readonly text: string;
}


export const tokenize = (latexString: string): Token[] => {
	const tokens: Token[] = [];
	let currentIndex = 0;

	while (currentIndex < latexString.length) {
		const character = latexString[currentIndex];

		if (/\s/.test(character)) {
			currentIndex++;
			continue;
		}

		const { token, nextIndex } = readNextToken(latexString, currentIndex);
		tokens.push(token);
		currentIndex = nextIndex;
	}

	return tokens;
}


const readNextToken = (latexString: string, startIndex: number): { token: Token; nextIndex: number } => {
	const character = latexString[startIndex];

	switch (character) {
		case '%':
			return readCommentToken(latexString, startIndex);

		case '\\':
			return readEscapeToken(latexString, startIndex);

		default:
			return readSingleCharacterToken(latexString, startIndex);
	}
}


const readCommentToken = (latexString: string, startIndex: number): { token: Token; nextIndex: number } => {
	const textLength = latexString.length;
	let lookaheadIndex = startIndex + 1;

	while (lookaheadIndex < textLength && latexString[lookaheadIndex] !== '\n') {
		lookaheadIndex++;
	}

	const token: Token = {
		start: startIndex,
		end: lookaheadIndex,
		text: latexString.slice(startIndex, lookaheadIndex),
	};

	return { token, nextIndex: lookaheadIndex };
}


const readEscapeToken = (latexString: string, startIndex: number): { token: Token; nextIndex: number } => {
	const textLength = latexString.length;
	let lookaheadIndex = startIndex + 1;

	if (lookaheadIndex < textLength && /[A-Za-z]/.test(latexString[lookaheadIndex])) {
		// commandToken: \sin, \frac ...
		lookaheadIndex++;
		while (lookaheadIndex < textLength && /[A-Za-z]/.test(latexString[lookaheadIndex])) {
			lookaheadIndex++;
		}
	} else if (lookaheadIndex < textLength) {
		// \%, \_, \{ ...
		lookaheadIndex++;
	} else {
		// Single '\' at the end of the string
	}

	const token: Token = {
		start: startIndex,
		end: lookaheadIndex,
		text: latexString.slice(startIndex, lookaheadIndex),
	};

	return { token, nextIndex: lookaheadIndex };
}


const readSingleCharacterToken = (latexString: string, startIndex: number): { token: Token; nextIndex: number } => {
	const endIndex = startIndex + 1;

	const token: Token = {
		start: startIndex,
		end: endIndex,
		text: latexString.slice(startIndex, endIndex),
	};

	return { token, nextIndex: endIndex };
}
