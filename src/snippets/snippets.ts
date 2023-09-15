import { Options } from "./options";

export class RawSnippet {
	trigger: string;
	replacement: string;
	options: string;
	priority?: number;
	description?: string;
}

export class ParsedSnippet {
	trigger: string;
	replacement: string;
	options: Options;
	priority?: number;
	description?: string;

	constructor(raw: RawSnippet) {
		const parsed = {...raw, options: Options.fromSource(raw.options)};
		Object.assign(this, parsed);
	}
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
