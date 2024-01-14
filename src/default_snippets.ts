export const DEFAULT_SNIPPETS_ARR = [
	// Math mode
	{trigger: "mk", replacement: "$$0$", options: "tA"},
	{trigger: "dm", replacement: "$$\n$0\n$$", options: "tAw"},
	{trigger: "beg", replacement: "\\begin{$0}\n$1\n\\end{$0}", options: "mA"},


	// Dashes
	// {trigger: "--", replacement: "–", options: "tA"},
	// {trigger: "–-", replacement: "—", options: "tA"},
	// {trigger: "—-", replacement: "---", options: "tA"},


	// Greek letters
	{trigger: "@a", replacement: "\\alpha", options: "mA"},
	{trigger: "@A", replacement: "\\alpha", options: "mA"},
	{trigger: "@b", replacement: "\\beta", options: "mA"},
	{trigger: "@B", replacement: "\\beta", options: "mA"},
	{trigger: "@c", replacement: "\\chi", options: "mA"},
	{trigger: "@C", replacement: "\\chi", options: "mA"},
	{trigger: "@g", replacement: "\\gamma", options: "mA"},
	{trigger: "@G", replacement: "\\Gamma", options: "mA"},
	{trigger: "@d", replacement: "\\delta", options: "mA"},
	{trigger: "@D", replacement: "\\Delta", options: "mA"},
	{trigger: "@e", replacement: "\\epsilon", options: "mA"},
	{trigger: "@E", replacement: "\\epsilon", options: "mA"},
	{trigger: ":e", replacement: "\\varepsilon", options: "mA"},
	{trigger: ":E", replacement: "\\varepsilon", options: "mA"},
	{trigger: "@z", replacement: "\\zeta", options: "mA"},
	{trigger: "@Z", replacement: "\\zeta", options: "mA"},
	{trigger: "@t", replacement: "\\theta", options: "mA"},
	{trigger: "@T", replacement: "\\Theta", options: "mA"},
	{trigger: "@k", replacement: "\\kappa", options: "mA"},
	{trigger: "@K", replacement: "\\kappa", options: "mA"},
	{trigger: "@l", replacement: "\\lambda", options: "mA"},
	{trigger: "@L", replacement: "\\Lambda", options: "mA"},
	{trigger: "@m", replacement: "\\mu", options: "mA"},
	{trigger: "@M", replacement: "\\mu", options: "mA"},
	{trigger: "@r", replacement: "\\rho", options: "mA"},
	{trigger: "@R", replacement: "\\rho", options: "mA"},
	{trigger: "@s", replacement: "\\sigma", options: "mA"},
	{trigger: "@S", replacement: "\\Sigma", options: "mA"},
	{trigger: "ome", replacement: "\\omega", options: "mA"},
	{trigger: "@o", replacement: "\\omega", options: "mA"},
	{trigger: "@O", replacement: "\\Omega", options: "mA"},
	{trigger: "@u", replacement: "\\upsilon", options: "mA"},
	{trigger: "@U", replacement: "\\Upsilon", options: "mA"},
	{trigger: "([^\\\\])(${GREEK}|${SYMBOL})", replacement: "[[0]]\\[[1]]", options: "rmA", description: "Add backslash before greek letters and symbols"},


	// Insert space after greek letters and symbols, etc
	{trigger: "\\\\(${GREEK}|${SYMBOL}|${SHORT_SYMBOL})([A-Za-z])", replacement: "\\[[0]] [[1]]", options: "rmA"},
	{trigger: "\\\\(${GREEK}|${SYMBOL}) sr", replacement: "\\[[0]]^{2}", options: "rmA"},
	{trigger: "\\\\(${GREEK}|${SYMBOL}) cb", replacement: "\\[[0]]^{3}", options: "rmA"},
	{trigger: "\\\\(${GREEK}|${SYMBOL}) rd", replacement: "\\[[0]]^{$0}$1", options: "rmA"},
	{trigger: "\\\\(${GREEK}|${SYMBOL}) hat", replacement: "\\hat{\\[[0]]}", options: "rmA"},
	{trigger: "\\\\(${GREEK}|${SYMBOL}) dot", replacement: "\\dot{\\[[0]]}", options: "rmA"},
	{trigger: "\\\\(${GREEK}|${SYMBOL}) bar", replacement: "\\bar{\\[[0]]}", options: "rmA"},
	{trigger: "\\\\(${GREEK}|${SYMBOL}) vec", replacement: "\\vec{\\[[0]]}", options: "rmA"},
	{trigger: "\\\\(${GREEK}|${SYMBOL}) tilde", replacement: "\\tilde{\\[[0]]}", options: "rmA"},
	{trigger: "\\\\(${GREEK}|${SYMBOL}) und", replacement: "\\underline{\\[[0]]}", options: "rmA"},
	{trigger: "\\\\(${GREEK}),\\.", replacement: "\\boldsymbol{\\[[0]]}", options: "rmA"},
	{trigger: "\\\\(${GREEK})\\.,", replacement: "\\boldsymbol{\\[[0]]}", options: "rmA"},


	// Operations
	{trigger: "te", replacement: "\\text{$0}", options: "m"},
	{trigger: "text", replacement: "\\text{$0}", options: "mA"},
	{trigger: "bf", replacement: "\\mathbf{$0}", options: "mA"},
	{trigger: "sr", replacement: "^{2}", options: "mA"},
	{trigger: "cb", replacement: "^{3}", options: "mA"},
	{trigger: "rd", replacement: "^{$0}$1", options: "mA"},
	{trigger: "_", replacement: "_{$0}$1", options: "mA"},
	{trigger: "sts", replacement: "_\\text{$0}", options: "rmA"},
	{trigger: "sq", replacement: "\\sqrt{ $0 }$1", options: "mA"},
	{trigger: "//", replacement: "\\frac{$0}{$1}$2", options: "mA"},
	{trigger: "ee", replacement: "e^{ $0 }$1", options: "mA"},
	{trigger: "rm", replacement: "\\mathrm{$0}$1", options: "mA"},
	{trigger: "conj", replacement: "^{*}", options: "mA"},
	{trigger: "trace", replacement: "\\mathrm{Tr}", options: "mA"},
	{trigger: "det", replacement: "\\det", options: "mA"},
	{trigger: "re", replacement: "\\mathrm{Re}", options: "mA"},
	{trigger: "im", replacement: "\\mathrm{Im}", options: "mA"},

	{trigger: "([a-zA-Z]),\\.", replacement: "\\mathbf{[[0]]}", options: "rmA"},
	{trigger: "([a-zA-Z])\\.,", replacement: "\\mathbf{[[0]]}", options: "rmA"},
	{trigger: "([A-Za-z])(\\d)", replacement: "[[0]]_{[[1]]}", options: "rmA", description: "Auto letter subscript", priority: -1},
	{trigger: "([A-Za-z])_(\\d\\d)", replacement: "[[0]]_{[[1]]}", options: "rmA"},
	{trigger: "\\hat{([A-Za-z])}(\\d)", replacement: "hat{[[0]]}_{[[1]]}", options: "rmA"},
	{trigger: "\\\\mathbf{([A-Za-z])}(\\d)", replacement: "\\mathbf{[[0]]}_{[[1]]}", options: "rmA"},
	{trigger: "\\\\vec{([A-Za-z])}(\\d)", replacement: "\\vec{[[0]]}_{[[1]]}", options: "rmA"},
	{trigger: "([a-zA-Z])bar", replacement: "\\bar{[[0]]}", options: "rmA"},
	{trigger: "([a-zA-Z])hat", replacement: "\\hat{[[0]]}", options: "rmA"},
	{trigger: "([a-zA-Z])ddot", replacement: "\\ddot{[[0]]}", options: "rmA", priority: 3},
	{trigger: "([a-zA-Z])dot", replacement: "\\dot{[[0]]}", options: "rmA", priority: 1},
	{trigger: "([a-zA-Z])vec", replacement: "\\vec{[[0]]}", options: "rmA"},
	{trigger: "([a-zA-Z])tilde", replacement: "\\tilde{[[0]]}", options: "rmA"},
	{trigger: "([a-zA-Z])und", replacement: "\\underline{[[0]]}", options: "rmA"},
	{trigger: "bar", replacement: "\\bar{$0}$1", options: "mA"},
	{trigger: "hat", replacement: "\\hat{$0}$1", options: "mA"},
	{trigger: "dot", replacement: "\\dot{$0}$1", options: "mA"},
	{trigger: "ddot", replacement: "\\ddot{$0}$1", options: "mA", priority: 2},
	{trigger: "cdot", replacement: "\\cdot", options: "mA", priority: 2},
	{trigger: "vec", replacement: "\\vec{$0}$1", options: "mA"},
	{trigger: "tilde", replacement: "\\tilde{$0}$1", options: "mA"},
	{trigger: "und", replacement: "\\underline{$0}$1", options: "mA"},

	{trigger: "([^\\\\])(arcsin|arccos|arctan|arccot|arccsc|arcsec|sin|cos|tan|cot|csc|sec)", replacement: "[[0]]\\[[1]]", options: "rmA"},
	{trigger: "\\\\(arcsin|arccos|arctan|arccot|arccsc|arcsec|sin|cos|tan|cot|csc|sec)([A-Za-gi-z])", replacement: "\\[[0]] [[1]]", options: "rmA"}, // Insert space after trig funcs. Skips letter "h" to allow sinh, cosh, etc.
	{trigger: "\\\\(arcsinh|arccosh|arctanh|arccoth|arcsch|arcsech|sinh|cosh|tanh|coth|csch|sech)([A-Za-z])", replacement: "\\[[0]] [[1]]", options: "rmA"}, // Insert space after trig funcs
	{trigger: "\\\\(neq|geq|leq|gg|ll|sim)([0-9]+)", replacement: "\\[[0]] [[1]]", options: "rmA"}, // Insert space after inequality symbols


	// Visual operations
	{trigger: "U", replacement: "\\underbrace{ ${VISUAL} }_{ $0 }", options: "mA"},
	{trigger: "B", replacement: "\\underset{ $0 }{ ${VISUAL} }", options: "mA"},
	{trigger: "C", replacement: "\\cancel{ ${VISUAL} }", options: "mA"},
	{trigger: "K", replacement: "\\cancelto{ $0 }{ ${VISUAL} }", options: "mA"},
	{trigger: "S", replacement: "\\sqrt{ ${VISUAL} }", options: "mA"},


	// Symbols
	{trigger: "ooo", replacement: "\\infty", options: "mA"},
	{trigger: "sum", replacement: "\\sum", options: "mA"},
	{trigger: "prod", replacement: "\\prod", options: "mA"},
	{trigger: "lim", replacement: "\\lim_{ ${0:n} \\to ${1:\\infty} } $2", options: "mA"},
	{trigger: "([^\\\\])pm", replacement: "[[0]]\\pm", options: "rm"},
	{trigger: "([^\\\\])mp", replacement: "[[0]]\\mp", options: "rm"},
	{trigger: "+-", replacement: "\\pm", options: "mA"},
	{trigger: "-+", replacement: "\\mp", options: "mA"},
	{trigger: "...", replacement: "\\dots", options: "mA"},
	{trigger: "<->", replacement: "\\leftrightarrow ", options: "mA"},
	{trigger: "->", replacement: "\\to", options: "mA"},
	{trigger: "!>", replacement: "\\mapsto", options: "mA"},
	{trigger: "invs", replacement: "^{-1}", options: "mA"},
	{trigger: "\\\\\\", replacement: "\\setminus", options: "mA"},
	{trigger: "||", replacement: "\\mid", options: "mA"},
	{trigger: "and", replacement: "\\cap", options: "mA"},
	{trigger: "orr", replacement: "\\cup", options: "mA"},
	{trigger: "inn", replacement: "\\in", options: "mA"},
	{trigger: "notin", replacement: "\\not\\in", options: "mA"},
	{trigger: "\\subset eq", replacement: "\\subseteq", options: "mA"},
	{trigger: "eset", replacement: "\\emptyset", options: "mA"},
	{trigger: "set", replacement: "\\{ $0 \\}$1", options: "mA"},
	{trigger: "=>", replacement: "\\implies", options: "mA"},
	{trigger: "=<", replacement: "\\impliedby", options: "mA"},
	{trigger: "iff", replacement: "\\iff", options: "mA"},
	{trigger: "e\\xi sts", replacement: "\\exists", options: "mA", priority: 1},
	{trigger: "===", replacement: "\\equiv", options: "mA"},
	{trigger: "Sq", replacement: "\\square", options: "mA"},
	{trigger: "!=", replacement: "\\neq", options: "mA"},
	{trigger: ">=", replacement: "\\geq", options: "mA"},
	{trigger: "<=", replacement: "\\leq", options: "mA"},
	{trigger: ">>", replacement: "\\gg", options: "mA"},
	{trigger: "<<", replacement: "\\ll", options: "mA"},
	{trigger: "~~", replacement: "\\sim", options: "mA"},
	{trigger: "\\sim ~", replacement: "\\approx", options: "mA"},
	{trigger: "prop", replacement: "\\propto", options: "mA"},
	{trigger: "nabl", replacement: "\\nabla", options: "mA"},
	{trigger: "del", replacement: "\\nabla", options: "mA"},
	{trigger: "xx", replacement: "\\times", options: "mA"},
	{trigger: "**", replacement: "\\cdot", options: "mA"},
	{trigger: "para", replacement: "\\parallel", options: "mA"},

	{trigger: "xnn", replacement: "x_{n}", options: "mA"},
	{trigger: "xii", replacement: "x_{i}", options: "mA"},
	{trigger: "xjj", replacement: "x_{j}", options: "mA"},
	{trigger: "xp1", replacement: "x_{n+1}", options: "mA"},
	{trigger: "ynn", replacement: "y_{n}", options: "mA"},
	{trigger: "yii", replacement: "y_{i}", options: "mA"},
	{trigger: "yjj", replacement: "y_{j}", options: "mA"},

	{trigger: "mcal", replacement: "\\mathcal{$0}$1", options: "mA"},
	{trigger: "mbb", replacement: "\\mathbb{$0}$1", options: "mA"},
	{trigger: "ell", replacement: "\\ell", options: "mA"},
	{trigger: "lll", replacement: "\\ell", options: "mA"},
	{trigger: "LL", replacement: "\\mathcal{L}", options: "mA"},
	{trigger: "HH", replacement: "\\mathcal{H}", options: "mA"},
	{trigger: "CC", replacement: "\\mathbb{C}", options: "mA"},
	{trigger: "RR", replacement: "\\mathbb{R}", options: "mA"},
	{trigger: "ZZ", replacement: "\\mathbb{Z}", options: "mA"},
	{trigger: "NN", replacement: "\\mathbb{N}", options: "mA"},
	{trigger: "II", replacement: "\\mathbb{1}", options: "mA"},
	{trigger: "\\mathbb{1}I", replacement: "\\hat{\\mathbb{1}}", options: "mA"},
	{trigger: "AA", replacement: "\\mathcal{A}", options: "mA"},
	{trigger: "BB", replacement: "\\mathbf{B}", options: "mA"},
	{trigger: "EE", replacement: "\\mathbf{E}", options: "mA"},


	// Unit vectors
	{trigger: ":i", replacement: "\\mathbf{i}", options: "mA"},
	{trigger: ":j", replacement: "\\mathbf{j}", options: "mA"},
	{trigger: ":k", replacement: "\\mathbf{k}", options: "mA"},
	{trigger: ":x", replacement: "\\hat{\\mathbf{x}}", options: "mA"},
	{trigger: ":y", replacement: "\\hat{\\mathbf{y}}", options: "mA"},
	{trigger: ":z", replacement: "\\hat{\\mathbf{z}}", options: "mA"},


	// Derivatives
	{trigger: "par", replacement: "\\frac{ \\partial ${0:y} }{ \\partial ${1:x} } $2", options: "m"},
	{trigger: "pa2", replacement: "\\frac{ \\partial^{2} ${0:y} }{ \\partial ${1:x}^{2} } $2", options: "mA"},
	{trigger: "pa3", replacement: "\\frac{ \\partial^{3} ${0:y} }{ \\partial ${1:x}^{3} } $2", options: "mA"},
	{trigger: "pa([A-Za-z])([A-Za-z])", replacement: "\\frac{ \\partial [[0]] }{ \\partial [[1]] } ", options: "rm"},
	{trigger: "pa([A-Za-z])([A-Za-z])([A-Za-z])", replacement: "\\frac{ \\partial^{2} [[0]] }{ \\partial [[1]] \\partial [[2]] } ", options: "rm"},
	{trigger: "pa([A-Za-z])([A-Za-z])2", replacement: "\\frac{ \\partial^{2} [[0]] }{ \\partial [[1]]^{2} } ", options: "rmA"},
	{trigger: "de([A-Za-z])([A-Za-z])", replacement: "\\frac{ d[[0]] }{ d[[1]] } ", options: "rm"},
	{trigger: "de([A-Za-z])([A-Za-z])2", replacement: "\\frac{ d^{2}[[0]] }{ d[[1]]^{2} } ", options: "rmA"},
	{trigger: "ddt", replacement: "\\frac{d}{dt} ", options: "mA"},


	// Integrals
	{trigger: "oinf", replacement: "\\int_{0}^{\\infty} $0 \\, d${1:x} $2", options: "mA"},
	{trigger: "infi", replacement: "\\int_{-\\infty}^{\\infty} $0 \\, d${1:x} $2", options: "mA"},
	{trigger: "dint", replacement: "\\int_{${0:0}}^{${1:\\infty}} $2 \\, d${3:x} $4", options: "mA"},
	{trigger: "oint", replacement: "\\oint", options: "mA"},
	{trigger: "iiint", replacement: "\\iiint", options: "mA"},
	{trigger: "iint", replacement: "\\iint", options: "mA"},
	{trigger: "int", replacement: "\\int $0 \\, d${1:x} $2", options: "mA"},


	// Physics
	{trigger: "kbt", replacement: "k_{B}T", options: "mA"},


	// Quantum mechanics
	{trigger: "hba", replacement: "\\hbar", options: "mA"},
	{trigger: "dag", replacement: "^{\\dagger}", options: "mA"},
	{trigger: "o+", replacement: "\\oplus ", options: "mA"},
	{trigger: "ox", replacement: "\\otimes ", options: "mA"},
	{trigger: "ot\\mathrm{Im}es", replacement: "\\otimes ", options: "mA"}, // Handle conflict with "im" snippet
	{trigger: "bra", replacement: "\\bra{$0} $1", options: "mA"},
	{trigger: "ket", replacement: "\\ket{$0} $1", options: "mA"},
	{trigger: "brk", replacement: "\\braket{ $0 | $1 } $2", options: "mA"},
	{trigger: "\\\\bra{([^|]+)\\|", replacement: "\\braket{ [[0]] | $0 ", options: "rmA", description: "Convert bra into braket"},
	{trigger: "\\\\bra{(.+)}([^ ]+)>", replacement: "\\braket{ [[0]] | $0 ", options: "rmA", description: "Convert bra into braket (alternate)"},
	{trigger: "outp", replacement: "\\ket{${0:\\psi}} \\bra{${0:\\psi}} $1", options: "mA"},


	// Chemistry
	{trigger: "pu", replacement: "\\pu{ $0 }", options: "mA"},
	{trigger: "msun", replacement: "M_{\\odot}", options: "mA"},
	{trigger: "solm", replacement: "M_{\\odot}", options: "mA"},
	{trigger: "cee", replacement: "\\ce{ $0 }", options: "mA"},
	{trigger: "iso", replacement: "{}^{${0:4}}_{${1:2}}${2:He}", options: "mA"},
	{trigger: "hel4", replacement: "{}^{4}_{2}He ", options: "mA"},
	{trigger: "hel3", replacement: "{}^{3}_{2}He ", options: "mA"},


	// Environments
	{trigger: "pmat", replacement: "\\begin{pmatrix}\n$0\n\\end{pmatrix}", options: "mA"},
	{trigger: "bmat", replacement: "\\begin{bmatrix}\n$0\n\\end{bmatrix}", options: "mA"},
	{trigger: "Bmat", replacement: "\\begin{Bmatrix}\n$0\n\\end{Bmatrix}", options: "mA"},
	{trigger: "vmat", replacement: "\\begin{vmatrix}\n$0\n\\end{vmatrix}", options: "mA"},
	{trigger: "Vmat", replacement: "\\begin{Vmatrix}\n$0\n\\end{Vmatrix}", options: "mA"},
	{trigger: "case", replacement: "\\begin{cases}\n$0\n\\end{cases}", options: "mA"},
	{trigger: "align", replacement: "\\begin{align}\n$0\n\\end{align}", options: "mA"},
	{trigger: "array", replacement: "\\begin{array}\n$0\n\\end{array}", options: "mA"},
	{trigger: "matrix", replacement: "\\begin{matrix}\n$0\n\\end{matrix}", options: "mA"},


	// Brackets
	{trigger: "avg", replacement: "\\langle $0 \\rangle $1", options: "mA"},
	{trigger: "norm", replacement: "\\lvert $0 \\rvert $1", options: "mA", priority: 1},
	{trigger: "ceil", replacement: "\\lceil $0 \\rceil $1", options: "mA"},
	{trigger: "floor", replacement: "\\lfloor $0 \\rfloor $1", options: "mA"},
	{trigger: "mod", replacement: "|$0|$1", options: "mA"},
	{trigger: "(", replacement: "(${VISUAL})", options: "mA"},
	{trigger: "[", replacement: "[${VISUAL}]", options: "mA"},
	{trigger: "{", replacement: "{${VISUAL}}", options: "mA"},
	{trigger: "(", replacement: "($0)$1", options: "mA"},
	{trigger: "{", replacement: "{$0}$1", options: "mA"},
	{trigger: "[", replacement: "[$0]$1", options: "mA"},
	{trigger: "lr(", replacement: "\\left( $0 \\right) $1", options: "mA"},
	{trigger: "lr|", replacement: "\\left| $0 \\right| $1", options: "mA"},
	{trigger: "lr{", replacement: "\\left\\{ $0 \\right\\} $1", options: "mA"},
	{trigger: "lr[", replacement: "\\left[ $0 \\right] $1", options: "mA"},
	{trigger: "lra", replacement: "\\left< $0 \\right> $1", options: "mA"},


	// Misc
	{trigger: "tayl", replacement: "${0:f}(${1:x} + ${2:h}) = ${0:f}(${1:x}) + ${0:f}'(${1:x})${2:h} + ${0:f}''(${1:x}) \\frac{${2:h}^{2}}{2!} + \\dots$3", options: "mA"},
	{trigger: /id(\d)/, replacement: (match) => {
		const n = match[1];

		let arr = [];
		for (let j = 0; j < n; j++) {
			arr[j] = [];
			for (let i = 0; i < n; i++) {
				arr[j][i] = (i === j) ? 1 : 0;
			}
		}

		let output = arr.map(el => el.join(" & ")).join(" \\\\\n");
		output = `\\begin{pmatrix}\n${output}\n\\end{pmatrix}`;
		return output;
	}, options: "m", description: "N x N identity matrix"},
];

export const DEFAULT_SNIPPETS = "[\n\t// Math mode\n\t{trigger: \"mk\", replacement: \"$$0$\", options: \"tA\"},\n\t{trigger: \"dm\", replacement: \"$$\\n$0\\n$$\", options: \"tAw\"},\n\t{trigger: \"beg\", replacement: \"\\\\begin{$0}\\n$1\\n\\\\end{$0}\", options: \"mA\"},\n\n\n\t// Dashes\n\t// {trigger: \"--\", replacement: \"–\", options: \"tA\"},\n\t// {trigger: \"–-\", replacement: \"—\", options: \"tA\"},\n\t// {trigger: \"—-\", replacement: \"---\", options: \"tA\"},\n\n\n\t// Greek letters\n\t{trigger: \"@a\", replacement: \"\\\\alpha\", options: \"mA\"},\n\t{trigger: \"@A\", replacement: \"\\\\alpha\", options: \"mA\"},\n\t{trigger: \"@b\", replacement: \"\\\\beta\", options: \"mA\"},\n\t{trigger: \"@B\", replacement: \"\\\\beta\", options: \"mA\"},\n\t{trigger: \"@c\", replacement: \"\\\\chi\", options: \"mA\"},\n\t{trigger: \"@C\", replacement: \"\\\\chi\", options: \"mA\"},\n\t{trigger: \"@g\", replacement: \"\\\\gamma\", options: \"mA\"},\n\t{trigger: \"@G\", replacement: \"\\\\Gamma\", options: \"mA\"},\n\t{trigger: \"@d\", replacement: \"\\\\delta\", options: \"mA\"},\n\t{trigger: \"@D\", replacement: \"\\\\Delta\", options: \"mA\"},\n\t{trigger: \"@e\", replacement: \"\\\\epsilon\", options: \"mA\"},\n\t{trigger: \"@E\", replacement: \"\\\\epsilon\", options: \"mA\"},\n\t{trigger: \":e\", replacement: \"\\\\varepsilon\", options: \"mA\"},\n\t{trigger: \":E\", replacement: \"\\\\varepsilon\", options: \"mA\"},\n\t{trigger: \"@z\", replacement: \"\\\\zeta\", options: \"mA\"},\n\t{trigger: \"@Z\", replacement: \"\\\\zeta\", options: \"mA\"},\n\t{trigger: \"@t\", replacement: \"\\\\theta\", options: \"mA\"},\n\t{trigger: \"@T\", replacement: \"\\\\Theta\", options: \"mA\"},\n\t{trigger: \"@k\", replacement: \"\\\\kappa\", options: \"mA\"},\n\t{trigger: \"@K\", replacement: \"\\\\kappa\", options: \"mA\"},\n\t{trigger: \"@l\", replacement: \"\\\\lambda\", options: \"mA\"},\n\t{trigger: \"@L\", replacement: \"\\\\Lambda\", options: \"mA\"},\n\t{trigger: \"@m\", replacement: \"\\\\mu\", options: \"mA\"},\n\t{trigger: \"@M\", replacement: \"\\\\mu\", options: \"mA\"},\n\t{trigger: \"@r\", replacement: \"\\\\rho\", options: \"mA\"},\n\t{trigger: \"@R\", replacement: \"\\\\rho\", options: \"mA\"},\n\t{trigger: \"@s\", replacement: \"\\\\sigma\", options: \"mA\"},\n\t{trigger: \"@S\", replacement: \"\\\\Sigma\", options: \"mA\"},\n\t{trigger: \"ome\", replacement: \"\\\\omega\", options: \"mA\"},\n\t{trigger: \"@o\", replacement: \"\\\\omega\", options: \"mA\"},\n\t{trigger: \"@O\", replacement: \"\\\\Omega\", options: \"mA\"},\n\t{trigger: \"@u\", replacement: \"\\\\upsilon\", options: \"mA\"},\n\t{trigger: \"@U\", replacement: \"\\\\Upsilon\", options: \"mA\"},\n\t{trigger: \"([^\\\\\\\\])(${GREEK}|${SYMBOL})\", replacement: \"[[0]]\\\\[[1]]\", options: \"rmA\", description: \"Add backslash before greek letters and symbols\"},\n\n\n\t// Insert space after greek letters and symbols, etc\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}|${SHORT_SYMBOL})([A-Za-z])\", replacement: \"\\\\[[0]] [[1]]\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) sr\", replacement: \"\\\\[[0]]^{2}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) cb\", replacement: \"\\\\[[0]]^{3}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) rd\", replacement: \"\\\\[[0]]^{$0}$1\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) hat\", replacement: \"\\\\hat{\\\\[[0]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) dot\", replacement: \"\\\\dot{\\\\[[0]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) bar\", replacement: \"\\\\bar{\\\\[[0]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) vec\", replacement: \"\\\\vec{\\\\[[0]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) tilde\", replacement: \"\\\\tilde{\\\\[[0]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) und\", replacement: \"\\\\underline{\\\\[[0]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK}),\\\\.\", replacement: \"\\\\boldsymbol{\\\\[[0]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(${GREEK})\\\\.,\", replacement: \"\\\\boldsymbol{\\\\[[0]]}\", options: \"rmA\"},\n\n\n\t// Operations\n\t{trigger: \"te\", replacement: \"\\\\text{$0}\", options: \"m\"},\n\t{trigger: \"text\", replacement: \"\\\\text{$0}\", options: \"mA\"},\n\t{trigger: \"bf\", replacement: \"\\\\mathbf{$0}\", options: \"mA\"},\n\t{trigger: \"sr\", replacement: \"^{2}\", options: \"mA\"},\n\t{trigger: \"cb\", replacement: \"^{3}\", options: \"mA\"},\n\t{trigger: \"rd\", replacement: \"^{$0}$1\", options: \"mA\"},\n\t{trigger: \"_\", replacement: \"_{$0}$1\", options: \"mA\"},\n\t{trigger: \"sts\", replacement: \"_\\\\text{$0}\", options: \"rmA\"},\n\t{trigger: \"sq\", replacement: \"\\\\sqrt{ $0 }$1\", options: \"mA\"},\n\t{trigger: \"//\", replacement: \"\\\\frac{$0}{$1}$2\", options: \"mA\"},\n\t{trigger: \"ee\", replacement: \"e^{ $0 }$1\", options: \"mA\"},\n\t{trigger: \"rm\", replacement: \"\\\\mathrm{$0}$1\", options: \"mA\"},\n\t{trigger: \"conj\", replacement: \"^{*}\", options: \"mA\"},\n\t{trigger: \"trace\", replacement: \"\\\\mathrm{Tr}\", options: \"mA\"},\n\t{trigger: \"det\", replacement: \"\\\\det\", options: \"mA\"},\n\t{trigger: \"re\", replacement: \"\\\\mathrm{Re}\", options: \"mA\"},\n\t{trigger: \"im\", replacement: \"\\\\mathrm{Im}\", options: \"mA\"},\n\n\t{trigger: \"([a-zA-Z]),\\\\.\", replacement: \"\\\\mathbf{[[0]]}\", options: \"rmA\"},\n\t{trigger: \"([a-zA-Z])\\\\.,\", replacement: \"\\\\mathbf{[[0]]}\", options: \"rmA\"},\n\t{trigger: \"([A-Za-z])(\\\\d)\", replacement: \"[[0]]_{[[1]]}\", options: \"rmA\", description: \"Auto letter subscript\", priority: -1},\n\t{trigger: \"([A-Za-z])_(\\\\d\\\\d)\", replacement: \"[[0]]_{[[1]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\hat{([A-Za-z])}(\\\\d)\", replacement: \"hat{[[0]]}_{[[1]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\mathbf{([A-Za-z])}(\\\\d)\", replacement: \"\\\\mathbf{[[0]]}_{[[1]]}\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\vec{([A-Za-z])}(\\\\d)\", replacement: \"\\\\vec{[[0]]}_{[[1]]}\", options: \"rmA\"},\n\t{trigger: \"([a-zA-Z])bar\", replacement: \"\\\\bar{[[0]]}\", options: \"rmA\"},\n\t{trigger: \"([a-zA-Z])hat\", replacement: \"\\\\hat{[[0]]}\", options: \"rmA\"},\n\t{trigger: \"([a-zA-Z])ddot\", replacement: \"\\\\ddot{[[0]]}\", options: \"rmA\", priority: 3},\n\t{trigger: \"([a-zA-Z])dot\", replacement: \"\\\\dot{[[0]]}\", options: \"rmA\", priority: 1},\n\t{trigger: \"([a-zA-Z])vec\", replacement: \"\\\\vec{[[0]]}\", options: \"rmA\"},\n\t{trigger: \"([a-zA-Z])tilde\", replacement: \"\\\\tilde{[[0]]}\", options: \"rmA\"},\n\t{trigger: \"([a-zA-Z])und\", replacement: \"\\\\underline{[[0]]}\", options: \"rmA\"},\n\t{trigger: \"bar\", replacement: \"\\\\bar{$0}$1\", options: \"mA\"},\n\t{trigger: \"hat\", replacement: \"\\\\hat{$0}$1\", options: \"mA\"},\n\t{trigger: \"dot\", replacement: \"\\\\dot{$0}$1\", options: \"mA\"},\n\t{trigger: \"ddot\", replacement: \"\\\\ddot{$0}$1\", options: \"mA\", priority: 2},\n\t{trigger: \"cdot\", replacement: \"\\\\cdot\", options: \"mA\", priority: 2},\n\t{trigger: \"vec\", replacement: \"\\\\vec{$0}$1\", options: \"mA\"},\n\t{trigger: \"tilde\", replacement: \"\\\\tilde{$0}$1\", options: \"mA\"},\n\t{trigger: \"und\", replacement: \"\\\\underline{$0}$1\", options: \"mA\"},\n\n\t{trigger: \"([^\\\\\\\\])(arcsin|arccos|arctan|arccot|arccsc|arcsec|sin|cos|tan|cot|csc|sec)\", replacement: \"[[0]]\\\\[[1]]\", options: \"rmA\"},\n\t{trigger: \"\\\\\\\\(arcsin|arccos|arctan|arccot|arccsc|arcsec|sin|cos|tan|cot|csc|sec)([A-Za-gi-z])\", replacement: \"\\\\[[0]] [[1]]\", options: \"rmA\"}, // Insert space after trig funcs. Skips letter \"h\" to allow sinh, cosh, etc.\n\t{trigger: \"\\\\\\\\(arcsinh|arccosh|arctanh|arccoth|arcsch|arcsech|sinh|cosh|tanh|coth|csch|sech)([A-Za-z])\", replacement: \"\\\\[[0]] [[1]]\", options: \"rmA\"}, // Insert space after trig funcs\n\t{trigger: \"\\\\\\\\(neq|geq|leq|gg|ll|sim)([0-9]+)\", replacement: \"\\\\[[0]] [[1]]\", options: \"rmA\"}, // Insert space after inequality symbols\n\n\n\t// Visual operations\n\t{trigger: \"U\", replacement: \"\\\\underbrace{ ${VISUAL} }_{ $0 }\", options: \"mA\"},\n\t{trigger: \"B\", replacement: \"\\\\underset{ $0 }{ ${VISUAL} }\", options: \"mA\"},\n\t{trigger: \"C\", replacement: \"\\\\cancel{ ${VISUAL} }\", options: \"mA\"},\n\t{trigger: \"K\", replacement: \"\\\\cancelto{ $0 }{ ${VISUAL} }\", options: \"mA\"},\n\t{trigger: \"S\", replacement: \"\\\\sqrt{ ${VISUAL} }\", options: \"mA\"},\n\n\n\t// Symbols\n\t{trigger: \"ooo\", replacement: \"\\\\infty\", options: \"mA\"},\n\t{trigger: \"sum\", replacement: \"\\\\sum\", options: \"mA\"},\n\t{trigger: \"prod\", replacement: \"\\\\prod\", options: \"mA\"},\n\t{trigger: \"lim\", replacement: \"\\\\lim_{ ${0:n} \\\\to ${1:\\\\infty} } $2\", options: \"mA\"},\n\t{trigger: \"([^\\\\\\\\])pm\", replacement: \"[[0]]\\\\pm\", options: \"rm\"},\n\t{trigger: \"([^\\\\\\\\])mp\", replacement: \"[[0]]\\\\mp\", options: \"rm\"},\n\t{trigger: \"+-\", replacement: \"\\\\pm\", options: \"mA\"},\n\t{trigger: \"-+\", replacement: \"\\\\mp\", options: \"mA\"},\n\t{trigger: \"...\", replacement: \"\\\\dots\", options: \"mA\"},\n\t{trigger: \"<->\", replacement: \"\\\\leftrightarrow \", options: \"mA\"},\n\t{trigger: \"->\", replacement: \"\\\\to\", options: \"mA\"},\n\t{trigger: \"!>\", replacement: \"\\\\mapsto\", options: \"mA\"},\n\t{trigger: \"invs\", replacement: \"^{-1}\", options: \"mA\"},\n\t{trigger: \"\\\\\\\\\\\\\", replacement: \"\\\\setminus\", options: \"mA\"},\n\t{trigger: \"||\", replacement: \"\\\\mid\", options: \"mA\"},\n\t{trigger: \"and\", replacement: \"\\\\cap\", options: \"mA\"},\n\t{trigger: \"orr\", replacement: \"\\\\cup\", options: \"mA\"},\n\t{trigger: \"inn\", replacement: \"\\\\in\", options: \"mA\"},\n\t{trigger: \"notin\", replacement: \"\\\\not\\\\in\", options: \"mA\"},\n\t{trigger: \"\\\\subset eq\", replacement: \"\\\\subseteq\", options: \"mA\"},\n\t{trigger: \"eset\", replacement: \"\\\\emptyset\", options: \"mA\"},\n\t{trigger: \"set\", replacement: \"\\\\{ $0 \\\\}$1\", options: \"mA\"},\n\t{trigger: \"=>\", replacement: \"\\\\implies\", options: \"mA\"},\n\t{trigger: \"=<\", replacement: \"\\\\impliedby\", options: \"mA\"},\n\t{trigger: \"iff\", replacement: \"\\\\iff\", options: \"mA\"},\n\t{trigger: \"e\\\\xi sts\", replacement: \"\\\\exists\", options: \"mA\", priority: 1},\n\t{trigger: \"===\", replacement: \"\\\\equiv\", options: \"mA\"},\n\t{trigger: \"Sq\", replacement: \"\\\\square\", options: \"mA\"},\n\t{trigger: \"!=\", replacement: \"\\\\neq\", options: \"mA\"},\n\t{trigger: \">=\", replacement: \"\\\\geq\", options: \"mA\"},\n\t{trigger: \"<=\", replacement: \"\\\\leq\", options: \"mA\"},\n\t{trigger: \">>\", replacement: \"\\\\gg\", options: \"mA\"},\n\t{trigger: \"<<\", replacement: \"\\\\ll\", options: \"mA\"},\n\t{trigger: \"~~\", replacement: \"\\\\sim\", options: \"mA\"},\n\t{trigger: \"\\\\sim ~\", replacement: \"\\\\approx\", options: \"mA\"},\n\t{trigger: \"prop\", replacement: \"\\\\propto\", options: \"mA\"},\n\t{trigger: \"nabl\", replacement: \"\\\\nabla\", options: \"mA\"},\n\t{trigger: \"del\", replacement: \"\\\\nabla\", options: \"mA\"},\n\t{trigger: \"xx\", replacement: \"\\\\times\", options: \"mA\"},\n\t{trigger: \"**\", replacement: \"\\\\cdot\", options: \"mA\"},\n\t{trigger: \"para\", replacement: \"\\\\parallel\", options: \"mA\"},\n\n\t{trigger: \"xnn\", replacement: \"x_{n}\", options: \"mA\"},\n\t{trigger: \"xii\", replacement: \"x_{i}\", options: \"mA\"},\n\t{trigger: \"xjj\", replacement: \"x_{j}\", options: \"mA\"},\n\t{trigger: \"xp1\", replacement: \"x_{n+1}\", options: \"mA\"},\n\t{trigger: \"ynn\", replacement: \"y_{n}\", options: \"mA\"},\n\t{trigger: \"yii\", replacement: \"y_{i}\", options: \"mA\"},\n\t{trigger: \"yjj\", replacement: \"y_{j}\", options: \"mA\"},\n\n\t{trigger: \"mcal\", replacement: \"\\\\mathcal{$0}$1\", options: \"mA\"},\n\t{trigger: \"mbb\", replacement: \"\\\\mathbb{$0}$1\", options: \"mA\"},\n\t{trigger: \"ell\", replacement: \"\\\\ell\", options: \"mA\"},\n\t{trigger: \"lll\", replacement: \"\\\\ell\", options: \"mA\"},\n\t{trigger: \"LL\", replacement: \"\\\\mathcal{L}\", options: \"mA\"},\n\t{trigger: \"HH\", replacement: \"\\\\mathcal{H}\", options: \"mA\"},\n\t{trigger: \"CC\", replacement: \"\\\\mathbb{C}\", options: \"mA\"},\n\t{trigger: \"RR\", replacement: \"\\\\mathbb{R}\", options: \"mA\"},\n\t{trigger: \"ZZ\", replacement: \"\\\\mathbb{Z}\", options: \"mA\"},\n\t{trigger: \"NN\", replacement: \"\\\\mathbb{N}\", options: \"mA\"},\n\t{trigger: \"II\", replacement: \"\\\\mathbb{1}\", options: \"mA\"},\n\t{trigger: \"\\\\mathbb{1}I\", replacement: \"\\\\hat{\\\\mathbb{1}}\", options: \"mA\"},\n\t{trigger: \"AA\", replacement: \"\\\\mathcal{A}\", options: \"mA\"},\n\t{trigger: \"BB\", replacement: \"\\\\mathbf{B}\", options: \"mA\"},\n\t{trigger: \"EE\", replacement: \"\\\\mathbf{E}\", options: \"mA\"},\n\n\n\t// Unit vectors\n\t{trigger: \":i\", replacement: \"\\\\mathbf{i}\", options: \"mA\"},\n\t{trigger: \":j\", replacement: \"\\\\mathbf{j}\", options: \"mA\"},\n\t{trigger: \":k\", replacement: \"\\\\mathbf{k}\", options: \"mA\"},\n\t{trigger: \":x\", replacement: \"\\\\hat{\\\\mathbf{x}}\", options: \"mA\"},\n\t{trigger: \":y\", replacement: \"\\\\hat{\\\\mathbf{y}}\", options: \"mA\"},\n\t{trigger: \":z\", replacement: \"\\\\hat{\\\\mathbf{z}}\", options: \"mA\"},\n\n\n\t// Derivatives\n\t{trigger: \"par\", replacement: \"\\\\frac{ \\\\partial ${0:y} }{ \\\\partial ${1:x} } $2\", options: \"m\"},\n\t{trigger: \"pa2\", replacement: \"\\\\frac{ \\\\partial^{2} ${0:y} }{ \\\\partial ${1:x}^{2} } $2\", options: \"mA\"},\n\t{trigger: \"pa3\", replacement: \"\\\\frac{ \\\\partial^{3} ${0:y} }{ \\\\partial ${1:x}^{3} } $2\", options: \"mA\"},\n\t{trigger: \"pa([A-Za-z])([A-Za-z])\", replacement: \"\\\\frac{ \\\\partial [[0]] }{ \\\\partial [[1]] } \", options: \"rm\"},\n\t{trigger: \"pa([A-Za-z])([A-Za-z])([A-Za-z])\", replacement: \"\\\\frac{ \\\\partial^{2} [[0]] }{ \\\\partial [[1]] \\\\partial [[2]] } \", options: \"rm\"},\n\t{trigger: \"pa([A-Za-z])([A-Za-z])2\", replacement: \"\\\\frac{ \\\\partial^{2} [[0]] }{ \\\\partial [[1]]^{2} } \", options: \"rmA\"},\n\t{trigger: \"de([A-Za-z])([A-Za-z])\", replacement: \"\\\\frac{ d[[0]] }{ d[[1]] } \", options: \"rm\"},\n\t{trigger: \"de([A-Za-z])([A-Za-z])2\", replacement: \"\\\\frac{ d^{2}[[0]] }{ d[[1]]^{2} } \", options: \"rmA\"},\n\t{trigger: \"ddt\", replacement: \"\\\\frac{d}{dt} \", options: \"mA\"},\n\n\n\t// Integrals\n\t{trigger: \"oinf\", replacement: \"\\\\int_{0}^{\\\\infty} $0 \\\\, d${1:x} $2\", options: \"mA\"},\n\t{trigger: \"infi\", replacement: \"\\\\int_{-\\\\infty}^{\\\\infty} $0 \\\\, d${1:x} $2\", options: \"mA\"},\n\t{trigger: \"dint\", replacement: \"\\\\int_{${0:0}}^{${1:\\\\infty}} $2 \\\\, d${3:x} $4\", options: \"mA\"},\n\t{trigger: \"oint\", replacement: \"\\\\oint\", options: \"mA\"},\n\t{trigger: \"iiint\", replacement: \"\\\\iiint\", options: \"mA\"},\n\t{trigger: \"iint\", replacement: \"\\\\iint\", options: \"mA\"},\n\t{trigger: \"int\", replacement: \"\\\\int $0 \\\\, d${1:x} $2\", options: \"mA\"},\n\n\n\t// Physics\n\t{trigger: \"kbt\", replacement: \"k_{B}T\", options: \"mA\"},\n\n\n\t// Quantum mechanics\n\t{trigger: \"hba\", replacement: \"\\\\hbar\", options: \"mA\"},\n\t{trigger: \"dag\", replacement: \"^{\\\\dagger}\", options: \"mA\"},\n\t{trigger: \"o+\", replacement: \"\\\\oplus \", options: \"mA\"},\n\t{trigger: \"ox\", replacement: \"\\\\otimes \", options: \"mA\"},\n\t{trigger: \"ot\\\\mathrm{Im}es\", replacement: \"\\\\otimes \", options: \"mA\"}, // Handle conflict with \"im\" snippet\n\t{trigger: \"bra\", replacement: \"\\\\bra{$0} $1\", options: \"mA\"},\n\t{trigger: \"ket\", replacement: \"\\\\ket{$0} $1\", options: \"mA\"},\n\t{trigger: \"brk\", replacement: \"\\\\braket{ $0 | $1 } $2\", options: \"mA\"},\n\t{trigger: \"\\\\\\\\bra{([^|]+)\\\\|\", replacement: \"\\\\braket{ [[0]] | $0 \", options: \"rmA\", description: \"Convert bra into braket\"},\n\t{trigger: \"\\\\\\\\bra{(.+)}([^ ]+)>\", replacement: \"\\\\braket{ [[0]] | $0 \", options: \"rmA\", description: \"Convert bra into braket (alternate)\"},\n\t{trigger: \"outp\", replacement: \"\\\\ket{${0:\\\\psi}} \\\\bra{${0:\\\\psi}} $1\", options: \"mA\"},\n\n\n\t// Chemistry\n\t{trigger: \"pu\", replacement: \"\\\\pu{ $0 }\", options: \"mA\"},\n\t{trigger: \"msun\", replacement: \"M_{\\\\odot}\", options: \"mA\"},\n\t{trigger: \"solm\", replacement: \"M_{\\\\odot}\", options: \"mA\"},\n\t{trigger: \"cee\", replacement: \"\\\\ce{ $0 }\", options: \"mA\"},\n\t{trigger: \"iso\", replacement: \"{}^{${0:4}}_{${1:2}}${2:He}\", options: \"mA\"},\n\t{trigger: \"hel4\", replacement: \"{}^{4}_{2}He \", options: \"mA\"},\n\t{trigger: \"hel3\", replacement: \"{}^{3}_{2}He \", options: \"mA\"},\n\n\n\t// Environments\n\t{trigger: \"pmat\", replacement: \"\\\\begin{pmatrix}\\n$0\\n\\\\end{pmatrix}\", options: \"mA\"},\n\t{trigger: \"bmat\", replacement: \"\\\\begin{bmatrix}\\n$0\\n\\\\end{bmatrix}\", options: \"mA\"},\n\t{trigger: \"Bmat\", replacement: \"\\\\begin{Bmatrix}\\n$0\\n\\\\end{Bmatrix}\", options: \"mA\"},\n\t{trigger: \"vmat\", replacement: \"\\\\begin{vmatrix}\\n$0\\n\\\\end{vmatrix}\", options: \"mA\"},\n\t{trigger: \"Vmat\", replacement: \"\\\\begin{Vmatrix}\\n$0\\n\\\\end{Vmatrix}\", options: \"mA\"},\n\t{trigger: \"case\", replacement: \"\\\\begin{cases}\\n$0\\n\\\\end{cases}\", options: \"mA\"},\n\t{trigger: \"align\", replacement: \"\\\\begin{align}\\n$0\\n\\\\end{align}\", options: \"mA\"},\n\t{trigger: \"array\", replacement: \"\\\\begin{array}\\n$0\\n\\\\end{array}\", options: \"mA\"},\n\t{trigger: \"matrix\", replacement: \"\\\\begin{matrix}\\n$0\\n\\\\end{matrix}\", options: \"mA\"},\n\n\n\t// Brackets\n\t{trigger: \"avg\", replacement: \"\\\\langle $0 \\\\rangle $1\", options: \"mA\"},\n\t{trigger: \"norm\", replacement: \"\\\\lvert $0 \\\\rvert $1\", options: \"mA\", priority: 1},\n\t{trigger: \"ceil\", replacement: \"\\\\lceil $0 \\\\rceil $1\", options: \"mA\"},\n\t{trigger: \"floor\", replacement: \"\\\\lfloor $0 \\\\rfloor $1\", options: \"mA\"},\n\t{trigger: \"mod\", replacement: \"|$0|$1\", options: \"mA\"},\n\t{trigger: \"(\", replacement: \"(${VISUAL})\", options: \"mA\"},\n\t{trigger: \"[\", replacement: \"[${VISUAL}]\", options: \"mA\"},\n\t{trigger: \"{\", replacement: \"{${VISUAL}}\", options: \"mA\"},\n\t{trigger: \"(\", replacement: \"($0)$1\", options: \"mA\"},\n\t{trigger: \"{\", replacement: \"{$0}$1\", options: \"mA\"},\n\t{trigger: \"[\", replacement: \"[$0]$1\", options: \"mA\"},\n\t{trigger: \"lr(\", replacement: \"\\\\left( $0 \\\\right) $1\", options: \"mA\"},\n\t{trigger: \"lr|\", replacement: \"\\\\left| $0 \\\\right| $1\", options: \"mA\"},\n\t{trigger: \"lr{\", replacement: \"\\\\left\\\\{ $0 \\\\right\\\\} $1\", options: \"mA\"},\n\t{trigger: \"lr[\", replacement: \"\\\\left[ $0 \\\\right] $1\", options: \"mA\"},\n\t{trigger: \"lra\", replacement: \"\\\\left< $0 \\\\right> $1\", options: \"mA\"},\n\n\n\t// Misc\n\t{trigger: \"tayl\", replacement: \"${0:f}(${1:x} + ${2:h}) = ${0:f}(${1:x}) + ${0:f}'(${1:x})${2:h} + ${0:f}''(${1:x}) \\\\frac{${2:h}^{2}}{2!} + \\\\dots$3\", options: \"mA\"},\n\t{trigger: /id(\\d)/, replacement: (match) => {\n\t\tconst n = match[1];\n\n\t\tlet arr = [];\n\t\tfor (let j = 0; j < n; j++) {\n\t\t\tarr[j] = [];\n\t\t\tfor (let i = 0; i < n; i++) {\n\t\t\t\tarr[j][i] = (i === j) ? 1 : 0;\n\t\t\t}\n\t\t}\n\n\t\tlet output = arr.map(el => el.join(\" & \")).join(\" \\\\\\\\\\n\");\n\t\toutput = `\\\\begin{pmatrix}\\n${output}\\n\\\\end{pmatrix}`;\n\t\treturn output;\n\t}, options: \"m\", description: \"N x N identity matrix\"},\n]";
