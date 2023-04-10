export interface Snippet {
    trigger: string,
    replacement: string,
    options: string,
    priority?: number,
    description?: string
}

export interface Environment {
    openSymbol: string,
    closeSymbol: string
}

export const SNIPPET_VARIABLES = {
	"${GREEK}":
		"alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|varphi|phi|Phi|chi|psi|Psi|omega|Omega",
	"${SYMBOL}":
		"approx|arccos|arccot|arccsc|arcsec|arcsin|arctan|cap|cdot|circ|cong|cos|cot|csc|cup|det|dots|ell|equiv|exists|exp|forall|ge|gg|hbar|iff|impliedby|implies|infty|land|leftarrow|Leftarrow|leftrightarrow|Leftrightarrow|ll|ln|log|lor|mapsto|mid|mp|nabla|ne|not|oplus|otimes|partial|perp|pm|propto|Rightarrow|setminus|simeq|sin|square|star|subseteq|tan|times|to",
	"${SHORT_SYMBOL}": "in|le|sim|subset",
};

export const EXCLUSIONS:{[trigger: string]: Environment} = {
    "([A-Za-z])(\\d)": {openSymbol: "\\pu{", closeSymbol: "}"},
    "->": {openSymbol: "\\ce{", closeSymbol: "}"}
}