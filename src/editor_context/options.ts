import type { IncludedPathsFunction } from "src/snippets/parse";

export class Options {
	mode: Mode;
	automatic: boolean;
	regex: boolean;
	onWordBoundary: boolean;
	visual: boolean;
	undoKey: boolean;
	includedPaths: IncludedPathsFunction;

	constructor({
		mode,
		automatic,
		regex,
		onWordBoundary,
		visual,
		undoKey,
		includedPaths
	}: {
		mode: Mode;
		automatic: boolean;
		regex: boolean;
		onWordBoundary: boolean;
		visual: boolean;
		undoKey: boolean;
		includedPaths: IncludedPathsFunction;
	}) {
		this.mode = mode;
		this.automatic = automatic;
		this.regex = regex;
		this.onWordBoundary = onWordBoundary;
		this.visual = visual;
		this.undoKey = undoKey;
		this.includedPaths = includedPaths;
	}

	static fromSource(source: string, language: string | undefined, includedPaths: IncludedPathsFunction): Options {
		const mode = Mode.fromSource(source, language);
		let automatic = false;
		let regex = false;
		let onWordBoundary = false;
		let visual = false;
		let undoKey = true;

		for (const flag_char of source) {
			switch (flag_char) {
				case "A":
					automatic = true;
					break;
				case "r":
					regex = true;
					break;
				case "w":
					onWordBoundary = true;
					break;
				case "v":
					visual = true;
					break;
				case "U":
					undoKey = false;
					break;
			}
		}
		return new Options({
			mode,
			automatic,
			regex,
			onWordBoundary,
			visual,
			undoKey,
			includedPaths,
		});
	}

	snippetShouldRunInMode(
		mode: Mode,
		ignoreSnippetLessEnv: boolean = false,
	): boolean {
		if (mode.snippetlessEnv && !ignoreSnippetLessEnv) {
			return false;
		}
		if (
			(this.mode.inlineMath && mode.inlineMath) ||
			(this.mode.blockMath && mode.blockMath) ||
			((this.mode.inlineMath || this.mode.blockMath) && mode.codeMath)
		) {
			// only run when snippet doesn't run in `\text{}` and cursor not inside `\text{}` or they both are
			if (mode.textEnv === this.mode.textEnv) {
				return true;
			}
		}

		if (this.mode.text && mode.text) {
			return true;
		}
		if (
			(this.mode.codeBlock === mode.codeBlock &&
				mode.codeBlock !== false) ||
			(this.mode.codeBlock === true && mode.codeBlock !== false)
		) {
			return true;
		}

		if (this.mode.code && mode.code) {
			return true;
		}
		return false;
	}

	copy() {
		return new Options({
			...this,
			mode: this.mode.copy(),
		});
	}
}


export class Mode {
	text: boolean;
	inlineMath: boolean;
	blockMath: boolean;
	codeMath: boolean;
	codeBlock: string | boolean;
	code: boolean;
	textEnv: boolean;
	snippetlessEnv: boolean;

	constructor({
		text,
		inlineMath: inlinemath,
		blockMath,
		codeMath,
		codeBlock,
		code,
		textEnv,
		snippetlessEnv,
	}: {
		text: boolean;
		inlineMath: boolean;
		blockMath: boolean;
		codeMath: boolean;
		codeBlock: string | boolean;
		code: boolean;
		textEnv: boolean;
		snippetlessEnv: boolean;
	}) {
		this.text = text;
		this.inlineMath = inlinemath;
		this.blockMath = blockMath;
		this.codeMath = codeMath;
		this.codeBlock = codeBlock;
		this.code = code;
		this.textEnv = textEnv;
		this.snippetlessEnv = snippetlessEnv;
	}

	/**
	 * Whether the state is inside an equation bounded by $ or $$ delimeters.
	 */
	inEquation(): boolean {
		return this.inlineMath || this.blockMath;
	}

	/**
	 * Whether the state is in any math mode.
	 *
	 * The equation may be bounded by $ or $$ delimeters, or it may be an equation inside a `math` codeblock.
	 */
	inMath(): boolean {
		return this.inlineMath || this.blockMath || this.codeMath;
	}

	inDisplayMath(): boolean {
		return this.blockMath || this.codeMath;
	}

	/**
	 * Whether the state is strictly in math mode.
	 *
	 * Returns false when the state is within math, but inside a text environment, such as \text{}.
	 */
	strictlyInMath(): boolean {
		return this.inMath() && !this.textEnv;
	}

	invert() {
		this.text = !this.text;
		this.blockMath = !this.blockMath;
		this.inlineMath = !this.inlineMath;
		this.codeMath = !this.codeMath;
		this.codeBlock = this.codeBlock === false ? true : false;
		this.code = !this.code;
		this.textEnv = !this.textEnv;
		this.snippetlessEnv = !this.snippetlessEnv;
	}

	static fromSource(source: string, language: string | undefined): Mode {
		let blockMath = false;
		let inlineMath = false;
		let text = false;
		let codeMath = false;
		let codeBlock: string | boolean = false;
		let code = false;
		let textEnv = false;
		let snippetlessEnv = false;

		for (const flag_char of source) {
			switch (flag_char) {
				case "m":
					blockMath = true;
					inlineMath = true;
					break;
				case "n":
					inlineMath = true;
					break;
				case "M":
					blockMath = true;
					break;
				case "t":
					text = true;
					break;
				case "T":
					textEnv = true;
					break;
				case "c":
					codeBlock = true;
					break;
				case "C":
					code = true;
					break;
			}
		}

		if (language !== undefined) {
			codeBlock = language;
		}

		if (textEnv && !(blockMath || inlineMath)) {
			blockMath = true;
			inlineMath = true;
		}
		const mode = new Mode({
			text,
			inlineMath,
			blockMath,
			codeMath,
			codeBlock,
			code,
			textEnv,
			snippetlessEnv,
		})

		if (
			!(
				mode.text ||
				mode.inlineMath ||
				mode.blockMath ||
				mode.codeMath ||
				mode.codeBlock !== false ||
				mode.textEnv ||
				mode.code
			)
		) {
			// for backwards compat we need to assume that this is a catchall mode then
			mode.invert();
			return mode;
		}

		return mode;
	}

	copy(): Mode {
		return new Mode({
			...this
		})
	}
}
