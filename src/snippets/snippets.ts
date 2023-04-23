import { Mode, parseMode } from "src/mode";

export interface Snippet {
    trigger: string,
    replacement: string,
    options: Options,
    priority?: number,
    description?: string
}

export class Options {
	mode!: Mode;
	automatic: boolean;
	regex: boolean;
	onWordBoundary: boolean;

	constructor() {
		this.mode = new Mode();
		this.automatic = false;
		this.regex = false;
		this.onWordBoundary = false;
	}
}

export function parseOptions(source: string):Options {
	let options = new Options();
	options.mode = parseMode(source);

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
		}
	}

	return options;
}

export interface Environment {
    openSymbol: string,
    closeSymbol: string
}

export const SNIPPET_VARIABLES = {
    "${GREEK}": "alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|varphi|phi|Phi|chi|psi|Psi|omega|Omega",
    "${SYMBOL}": "hbar|ell|nabla|infty|dots|leftrightarrow|mapsto|setminus|mid|cap|cup|land|lor|subseteq|subset|implies|impliedby|iff|exists|equiv|square|neq|geq|leq|gg|ll|sim|simeq|approx|propto|cdot|oplus|otimes|times|star|perp|det|exp|ln|log|partial",
    "${SHORT_SYMBOL}": "to|pm|mp"
};

export const EXCLUSIONS:{[trigger: string]: Environment} = {
    "([A-Za-z])(\\d)": {openSymbol: "\\pu{", closeSymbol: "}"},
    "->": {openSymbol: "\\ce{", closeSymbol: "}"}
}
