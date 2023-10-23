export class Options {
	mode!: Mode;
	automatic: boolean;
	regex: boolean;
	onWordBoundary: boolean;
	visual: boolean;

	constructor() {
		this.mode = new Mode();
		this.automatic = false;
		this.regex = false;
		this.onWordBoundary = false;
		this.visual = false;
	}

	static fromSource(source: string):Options {
		const options = new Options();
		options.mode = Mode.fromSource(source);

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
			}
		}

		return options;
	}
}

export class Mode {
	text: boolean;
	inlineMath: boolean;
	blockMath: boolean;
	codeMath: boolean;
	code: boolean;
	textEnv: boolean;

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

	/**
	 * Whether the state is strictly in math mode.
	 *
	 * Returns false when the state is within math, but inside a text environment, such as \text{}.
	 */
	strictlyInMath():boolean {
		return this.inMath() && !this.textEnv;
	}

	constructor() {
		this.text = false;
		this.blockMath = false;
		this.inlineMath = false;
		this.code = false;
		this.textEnv = false;
	}

	invert() {
		this.text = !this.text;
		this.blockMath = !this.blockMath;
		this.inlineMath = !this.inlineMath;
		this.codeMath = !this.codeMath;
		this.code = !this.code;
		this.textEnv = !this.textEnv;
	}

	static fromSource(source: string): Mode {
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
					mode.code = true;
					break;
			}
		}


		if (!(mode.text ||
			mode.inlineMath ||
			mode.blockMath ||
			mode.codeMath ||
			mode.code ||
			mode.textEnv)
		) {
			// for backwards compat we need to assume that this is a catchall mode then
			mode.invert();
			return mode;
		}

		return mode;
	}
}
