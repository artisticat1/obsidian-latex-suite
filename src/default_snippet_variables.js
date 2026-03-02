{
	"${GREEK}": "(?:alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|vartheta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|omicron|pi|rho|varrho|sigma|Sigma|tau|upsilon|Upsilon|phi|varphi|Phi|chi|psi|omega|Omega)",
	"${SYMBOL}": "(?:parallel|perp|partial|nabla|hbar|ell|infty|oplus|ominus|otimes|oslash|square|star|dagger|vee|wedge|subseteq|subset|supseteq|supset|emptyset|exists|nexists|forall|implies|impliedby|iff|setminus|neg|lor|land|bigcup|bigcap|cdot|times|simeq|approx)",
	"${MORE_SYMBOLS}": "(?:leq|geq|neq|gg|ll|equiv|sim|propto|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|to|mapsto|cap|cup|in|sum|prod|exp|ln|log|det|dots|vdots|ddots|pm|mp|int|iint|iiint|oint)"
    "${ACCENT}": "dot|ddot|hat|bar|tilde|vec|underline|overline|mathbf|mathcal|mathrm|mathbb",
	
	// ACCENT2 is intentionally identical to ACCENT.
	// Reason: in some LaTeX Suite setups, a variable used twice in the SAME trigger string is not substituted reliably the second time (the literal ${ACCENT} remains, so the regex never matches).
    // Workaround: use a second variable name for the second occurrence.
    "${ACCENT2}": "dot|ddot|hat|bar|tilde|vec|underline|overline|mathbf|mathcal|mathrm|mathbb"
    
    //  BASE_SYMBOL matches either a LaTeX Greek macro like \alpha, \Gamma OR or a single ASCII letter a..z / A..Z
	"${BASE_SYMBOL}": "\\\\(?:${GREEK})|[A-Za-z]"
}
