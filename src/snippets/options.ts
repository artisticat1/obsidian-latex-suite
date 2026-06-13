export class Options {
	mode: Mode;
	automatic: boolean;
	regex: boolean;
	onWordBoundary: boolean;
	visual: boolean;
	undoKey: boolean;

	constructor() {
		this.mode = new Mode();
		this.automatic = false;
		this.regex = false;
		this.onWordBoundary = false;
		this.visual = false;
		this.undoKey = true;
	}

	static fromSource(source: string, language: string | undefined): Options {
		const options = new Options();
		options.mode = Mode.fromSource(source, language);

		for (const flag_char of source) {
			switch (flag_char) {
				case "A":
					options.automatic = true;
					break;
				case "r":
					options.regex = true;
					break;
				case "w":
					options.onWordBoundary = true;
					break;
				case "v":
					options.visual = true;
					break;
				case "U":
					options.undoKey = false;
					break;
			}
		}

		return options;
	}

	snippetShouldRunInMode(mode: Mode) {
		if (mode.snippetlessEnv) {
			return false
		}
		if (
			(this.mode.inlineMath && mode.inlineMath) ||
			(this.mode.blockMath && mode.blockMath) ||
			((this.mode.inlineMath || this.mode.blockMath) && mode.codeMath)
		) {
			if (!mode.textEnv) {
				return true;
			}
		}

		if (mode.inMath() && mode.textEnv && this.mode.text) {
			return true;
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
	}
}


export class Mode {
	text: boolean = false;
	inlineMath: boolean = false;
	blockMath: boolean = false;
	codeMath: boolean = false;
	codeBlock: string | boolean = false;
	code: boolean = false;
	textEnv: boolean = false;
	snippetlessEnv: boolean = false;

	/**
	 * Whether the state is inside an equation bounded by $ or $$ delimeters.
	 */
	inEquation():boolean {
		return this.inlineMath || this.blockMath;
	}

	/**
	 * Whether the state is in any math mode.
	 *
	 * The equation may be bounded by $ or $$ delimeters, or it may be an equation inside a `math` codeblock.
	 */
	inMath():boolean {
		return this.inlineMath || this.blockMath || this.codeMath;
	}
	
	inDisplayMath():boolean {
		return this.blockMath || this.codeMath;
	}

	/**
	 * Whether the state is strictly in math mode.
	 *
	 * Returns false when the state is within math, but inside a text environment, such as \text{}.
	 */
	strictlyInMath():boolean {
		return this.inMath() && !this.textEnv && !this.snippetlessEnv;
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
		const mode = new Mode();

		for (const flag_char of source) {
			switch (flag_char) {
				case "m":
					mode.blockMath = true;
					mode.inlineMath = true;
					break;
				case "n":
					mode.inlineMath = true;
					break;
				case "M":
					mode.blockMath = true;
					break;
				case "t":
					mode.text = true;
					break;
				case "c":
					mode.codeBlock = true;
					break;
				case "C":
					mode.code = true;
					break;
			}
		}

		if (language !== undefined) {
			mode.codeBlock = language;
		}

		if (!(mode.text ||
			mode.inlineMath ||
			mode.blockMath ||
			mode.codeMath ||
			mode.codeBlock !== false ||
			mode.textEnv ||
			mode.code)
		) {
			// for backwards compat we need to assume that this is a catchall mode then
			mode.invert();
			return mode;
		}

		return mode;
	}
}
