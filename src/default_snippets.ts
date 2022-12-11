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
    {trigger: "([^\\\\])(${GREEK}|${SYMBOL})", replacement: "[[0]]\\[[1]]", options: "rmA", description: "Add backslash before greek letters and symbols"},


    // Insert space after greek letters and symbols, etc
    {trigger: "\\\\(${GREEK}|${SYMBOL}|${SHORT_SYMBOL})([A-Za-z])", replacement: "\\[[0]] [[1]]", options: "rmA"},
    {trigger: "\\\\(${GREEK}|${SYMBOL}) sr", replacement: "\\[[0]]^{2}", options: "rmA"},
    {trigger: "\\\\(${GREEK}|${SYMBOL}) cb", replacement: "\\[[0]]^{3}", options: "rmA"},
    {trigger: "\\\\(${GREEK}|${SYMBOL}) rd", replacement: "\\[[0]]^{$0}$1", options: "rmA"},
    {trigger: "\\\\(${GREEK}|${SYMBOL}) hat", replacement: "\\hat{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK}|${SYMBOL}) dot", replacement: "\\dot{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK}|${SYMBOL}) bar", replacement: "\\bar{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK}),\\.", replacement: "\\mathbf{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK})\\.,", replacement: "\\mathbf{\\[[0]]}", options: "rmA"},


    // Operations
    {trigger: "te", replacement: "\\text{$0}", options: "m"},
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
    {trigger: "([a-zA-Z]),\\.", replacement: "\\mathbf{[[0]]}", options: "rmA"},
    {trigger: "([a-zA-Z])\\.,", replacement: "\\mathbf{[[0]]}", options: "rmA"},
    {trigger: "([A-Za-z])(\\d)", replacement: "[[0]]_{[[1]]}", options: "rmA", description: "Auto letter subscript", priority: -1},
    {trigger: "\\\\mathbf{([A-Za-z])}(\\d)", replacement: "\\mathbf{[[0]]}_{[[1]]}", options: "rmA"},
    {trigger: "([A-Za-z])_(\\d\\d)", replacement: "[[0]]_{[[1]]}", options: "rmA"},
    {trigger: "\\hat{([A-Za-z])}(\\d)", replacement: "hat{[[0]]}_{[[1]]}", options: "rmA"},
    {trigger: "([a-zA-Z])bar", replacement: "\\bar{[[0]]}", options: "rmA"},
    {trigger: "([a-zA-Z])hat", replacement: "\\hat{[[0]]}", options: "rmA"},
    {trigger: "([a-zA-Z])ddot", replacement: "\\ddot{[[0]]}", options: "rmA"},
    {trigger: "ddot", replacement: "\\ddot{$0}", options: "mA"},
    {trigger: "([a-zA-Z])dot", replacement: "\\dot{[[0]]}", options: "rmA"},
    {trigger: "conj", replacement: "^{*}", options: "mA"},
    {trigger: "bar", replacement: "\\bar{$0}", options: "mA"},
    {trigger: "hat", replacement: "\\hat{$0}", options: "mA"},
    {trigger: "dot", replacement: "\\dot{$0}", options: "mA"},
    {trigger: "([^\\\\])(arcsin|arccos|arctan|arccot|arccsc|arcsec|sin|cos|tan|cot|csc)", replacement: "[[0]]\\[[1]]", options: "rmA"},
    {trigger: "\\\\(arcsin|arccos|arctan|arccot|arccsc|arcsec|sin|cos|tan|cot|csc)([A-Za-gi-z])", replacement: "\\[[0]] [[1]]", options: "rmA"}, // Insert space after trig funcs. Skips letter "h" to allow sinh, cosh, etc.
    {trigger: "\\\\(arcsinh|arccosh|arctanh|arccoth|arcsch|arcsech|sinh|cosh|tanh|coth|csch)([A-Za-z])", replacement: "\\[[0]] [[1]]", options: "rmA"}, // Insert space after trig funcs
    {trigger: "\\\\(neq|geq|leq|gg|ll|sim)([0-9]+)", replacement: "\\[[0]] [[1]]", options: "rmA"}, // Insert space after inequality symbols
    {trigger: "trace", replacement: "\\mathrm{Tr}", options: "mA"},
    {trigger: "det", replacement: "\\det", options: "mA"},
    {trigger: "re", replacement: "\\mathrm{Re}", options: "mA"},
    {trigger: "im", replacement: "\\mathrm{Im}", options: "mA"},


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
    {trigger: "pm", replacement: "\\pm", options: "m"},
    {trigger: "mp", replacement: "\\mp", options: "m"},
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
    {trigger: "\\subset eq", replacement: "\\subseteq", options: "mA"},
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
    {trigger: "pal", replacement: "\\parallel", options: "mA"},


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
    {trigger: "ce", replacement: "\\ce{ $0 }", options: "mA"},
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
    {trigger: "mod", replacement: "|$0|$1", options: "mA"},
    {trigger: "(", replacement: "(${VISUAL})", options: "mA"},
    {trigger: "[", replacement: "[${VISUAL}]", options: "mA"},
    {trigger: "{", replacement: "{${VISUAL}}", options: "mA"},
    {trigger: "(", replacement: "($0)$1", options: "mAw"},
    {trigger: "{", replacement: "{$0}$1", options: "mAw"},
    {trigger: "[", replacement: "[$0]$1", options: "mAw"},
    {trigger: "lr(", replacement: "\\left( $0 \\right) $1", options: "mA"},
    {trigger: "lr|", replacement: "\\left| $0 \\right| $1", options: "mA"},
    {trigger: "lr{", replacement: "\\left\\{ $0 \\right\\} $1", options: "mA"},
    {trigger: "lr[", replacement: "\\left[ $0 \\right] $1", options: "mA"},
    {trigger: "lra", replacement: "\\left< $0 \\right> $1", options: "mA"},



    // Misc
    {trigger: "tayl", replacement: "${0:f}(${1:x} + ${2:h}) = ${0:f}(${1:x}) + ${0:f}'(${1:x})${2:h} + ${0:f}''(${1:x}) \\frac{${2:h}^{2}}{2!} + \\dots$3", options: "mA"},
];



export const DEFAULT_SNIPPETS = "[\n    // Math mode\n    {trigger: \"mk\", replacement: \"$$0$\", options: \"tA\"},\n    {trigger: \"dm\", replacement: \"$$\\n$0\\n$$\", options: \"tAw\"},\n    {trigger: \"beg\", replacement: \"\\\\begin{$0}\\n$1\\n\\\\end{$0}\", options: \"mA\"},\n\n\n    // Dashes\n    // {trigger: \"--\", replacement: \"–\", options: \"tA\"},\n    // {trigger: \"–-\", replacement: \"—\", options: \"tA\"},\n    // {trigger: \"—-\", replacement: \"---\", options: \"tA\"},\n\n\n    // Greek letters\n    {trigger: \"@a\", replacement: \"\\\\alpha\", options: \"mA\"},\n    {trigger: \"@A\", replacement: \"\\\\alpha\", options: \"mA\"},\n    {trigger: \"@b\", replacement: \"\\\\beta\", options: \"mA\"},\n    {trigger: \"@B\", replacement: \"\\\\beta\", options: \"mA\"},\n    {trigger: \"@c\", replacement: \"\\\\chi\", options: \"mA\"},\n    {trigger: \"@C\", replacement: \"\\\\chi\", options: \"mA\"},\n    {trigger: \"@g\", replacement: \"\\\\gamma\", options: \"mA\"},\n    {trigger: \"@G\", replacement: \"\\\\Gamma\", options: \"mA\"},\n    {trigger: \"@d\", replacement: \"\\\\delta\", options: \"mA\"},\n    {trigger: \"@D\", replacement: \"\\\\Delta\", options: \"mA\"},\n    {trigger: \"@e\", replacement: \"\\\\epsilon\", options: \"mA\"},\n    {trigger: \"@E\", replacement: \"\\\\epsilon\", options: \"mA\"},\n    {trigger: \":e\", replacement: \"\\\\varepsilon\", options: \"mA\"},\n    {trigger: \":E\", replacement: \"\\\\varepsilon\", options: \"mA\"},\n    {trigger: \"@z\", replacement: \"\\\\zeta\", options: \"mA\"},\n    {trigger: \"@Z\", replacement: \"\\\\zeta\", options: \"mA\"},\n    {trigger: \"@t\", replacement: \"\\\\theta\", options: \"mA\"},\n    {trigger: \"@T\", replacement: \"\\\\Theta\", options: \"mA\"},\n    {trigger: \"@k\", replacement: \"\\\\kappa\", options: \"mA\"},\n    {trigger: \"@K\", replacement: \"\\\\kappa\", options: \"mA\"},\n    {trigger: \"@l\", replacement: \"\\\\lambda\", options: \"mA\"},\n    {trigger: \"@L\", replacement: \"\\\\Lambda\", options: \"mA\"},\n    {trigger: \"@m\", replacement: \"\\\\mu\", options: \"mA\"},\n    {trigger: \"@M\", replacement: \"\\\\mu\", options: \"mA\"},\n    {trigger: \"@r\", replacement: \"\\\\rho\", options: \"mA\"},\n    {trigger: \"@R\", replacement: \"\\\\rho\", options: \"mA\"},\n    {trigger: \"@s\", replacement: \"\\\\sigma\", options: \"mA\"},\n    {trigger: \"@S\", replacement: \"\\\\Sigma\", options: \"mA\"},\n    {trigger: \"ome\", replacement: \"\\\\omega\", options: \"mA\"},\n    {trigger: \"@o\", replacement: \"\\\\omega\", options: \"mA\"},\n    {trigger: \"@O\", replacement: \"\\\\Omega\", options: \"mA\"},\n    {trigger: \"([^\\\\\\\\])(${GREEK}|${SYMBOL})\", replacement: \"[[0]]\\\\[[1]]\", options: \"rmA\", description: \"Add backslash before greek letters and symbols\"},\n\n\n    // Insert space after greek letters and symbols, etc\n    {trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}|${SHORT_SYMBOL})([A-Za-z])\", replacement: \"\\\\[[0]] [[1]]\", options: \"rmA\"},\n    {trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) sr\", replacement: \"\\\\[[0]]^{2}\", options: \"rmA\"},\n    {trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) cb\", replacement: \"\\\\[[0]]^{3}\", options: \"rmA\"},\n    {trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) rd\", replacement: \"\\\\[[0]]^{$0}$1\", options: \"rmA\"},\n    {trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) hat\", replacement: \"\\\\hat{\\\\[[0]]}\", options: \"rmA\"},\n    {trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) dot\", replacement: \"\\\\dot{\\\\[[0]]}\", options: \"rmA\"},\n    {trigger: \"\\\\\\\\(${GREEK}|${SYMBOL}) bar\", replacement: \"\\\\bar{\\\\[[0]]}\", options: \"rmA\"},\n    {trigger: \"\\\\\\\\(${GREEK}),\\\\.\", replacement: \"\\\\mathbf{\\\\[[0]]}\", options: \"rmA\"},\n    {trigger: \"\\\\\\\\(${GREEK})\\\\.,\", replacement: \"\\\\mathbf{\\\\[[0]]}\", options: \"rmA\"},\n\n\n    // Operations\n    {trigger: \"te\", replacement: \"\\\\text{$0}\", options: \"m\"},\n    {trigger: \"bf\", replacement: \"\\\\mathbf{$0}\", options: \"mA\"},\n    {trigger: \"sr\", replacement: \"^{2}\", options: \"mA\"},\n    {trigger: \"cb\", replacement: \"^{3}\", options: \"mA\"},\n    {trigger: \"rd\", replacement: \"^{$0}$1\", options: \"mA\"},\n    {trigger: \"_\", replacement: \"_{$0}$1\", options: \"mA\"},\n    {trigger: \"sts\", replacement: \"_\\\\text{$0}\", options: \"rmA\"},\n    {trigger: \"sq\", replacement: \"\\\\sqrt{ $0 }$1\", options: \"mA\"},\n    {trigger: \"//\", replacement: \"\\\\frac{$0}{$1}$2\", options: \"mA\"},\n    {trigger: \"ee\", replacement: \"e^{ $0 }$1\", options: \"mA\"},\n    {trigger: \"rm\", replacement: \"\\\\mathrm{$0}$1\", options: \"mA\"},\n    {trigger: \"([a-zA-Z]),\\\\.\", replacement: \"\\\\mathbf{[[0]]}\", options: \"rmA\"},\n    {trigger: \"([a-zA-Z])\\\\.,\", replacement: \"\\\\mathbf{[[0]]}\", options: \"rmA\"},\n    {trigger: \"([A-Za-z])(\\\\d)\", replacement: \"[[0]]_{[[1]]}\", options: \"rmA\", description: \"Auto letter subscript\", priority: -1},\n    {trigger: \"\\\\\\\\mathbf{([A-Za-z])}(\\\\d)\", replacement: \"\\\\mathbf{[[0]]}_{[[1]]}\", options: \"rmA\"},\n    {trigger: \"([A-Za-z])_(\\\\d\\\\d)\", replacement: \"[[0]]_{[[1]]}\", options: \"rmA\"},\n    {trigger: \"\\\\hat{([A-Za-z])}(\\\\d)\", replacement: \"hat{[[0]]}_{[[1]]}\", options: \"rmA\"},\n    {trigger: \"([a-zA-Z])bar\", replacement: \"\\\\bar{[[0]]}\", options: \"rmA\"},\n    {trigger: \"([a-zA-Z])hat\", replacement: \"\\\\hat{[[0]]}\", options: \"rmA\"},\n    {trigger: \"([a-zA-Z])ddot\", replacement: \"\\\\ddot{[[0]]}\", options: \"rmA\"},\n    {trigger: \"ddot\", replacement: \"\\\\ddot{$0}\", options: \"mA\"},\n    {trigger: \"([a-zA-Z])dot\", replacement: \"\\\\dot{[[0]]}\", options: \"rmA\"},\n    {trigger: \"conj\", replacement: \"^{*}\", options: \"mA\"},\n    {trigger: \"bar\", replacement: \"\\\\bar{$0}\", options: \"mA\"},\n    {trigger: \"hat\", replacement: \"\\\\hat{$0}\", options: \"mA\"},\n    {trigger: \"dot\", replacement: \"\\\\dot{$0}\", options: \"mA\"},\n    {trigger: \"([^\\\\\\\\])(arcsin|arccos|arctan|arccot|arccsc|arcsec|sin|cos|tan|cot|csc)\", replacement: \"[[0]]\\\\[[1]]\", options: \"rmA\"},\n    {trigger: \"\\\\\\\\(arcsin|arccos|arctan|arccot|arccsc|arcsec|sin|cos|tan|cot|csc)([A-Za-gi-z])\", replacement: \"\\\\[[0]] [[1]]\", options: \"rmA\"}, // Insert space after trig funcs. Skips letter \"h\" to allow sinh, cosh, etc.\n    {trigger: \"\\\\\\\\(arcsinh|arccosh|arctanh|arccoth|arcsch|arcsech|sinh|cosh|tanh|coth|csch)([A-Za-z])\", replacement: \"\\\\[[0]] [[1]]\", options: \"rmA\"}, // Insert space after trig funcs\n    {trigger: \"\\\\\\\\(neq|geq|leq|gg|ll|sim)([0-9]+)\", replacement: \"\\\\[[0]] [[1]]\", options: \"rmA\"}, // Insert space after inequality symbols\n    {trigger: \"trace\", replacement: \"\\\\mathrm{Tr}\", options: \"mA\"},\n    {trigger: \"det\", replacement: \"\\\\det\", options: \"mA\"},\n    {trigger: \"re\", replacement: \"\\\\mathrm{Re}\", options: \"mA\"},\n    {trigger: \"im\", replacement: \"\\\\mathrm{Im}\", options: \"mA\"},\n\n\n    // Visual operations\n    {trigger: \"U\", replacement: \"\\\\underbrace{ ${VISUAL} }_{ $0 }\", options: \"mA\"},\n    {trigger: \"B\", replacement: \"\\\\underset{ $0 }{ ${VISUAL} }\", options: \"mA\"},\n    {trigger: \"C\", replacement: \"\\\\cancel{ ${VISUAL} }\", options: \"mA\"},\n    {trigger: \"K\", replacement: \"\\\\cancelto{ $0 }{ ${VISUAL} }\", options: \"mA\"},\n    {trigger: \"S\", replacement: \"\\\\sqrt{ ${VISUAL} }\", options: \"mA\"},\n\n\n\n    // Symbols\n    {trigger: \"ooo\", replacement: \"\\\\infty\", options: \"mA\"},\n    {trigger: \"sum\", replacement: \"\\\\sum\", options: \"mA\"},\n    {trigger: \"prod\", replacement: \"\\\\prod\", options: \"mA\"},\n    {trigger: \"lim\", replacement: \"\\\\lim_{ ${0:n} \\\\to ${1:\\\\infty} } $2\", options: \"mA\"},\n    {trigger: \"pm\", replacement: \"\\\\pm\", options: \"m\"},\n    {trigger: \"mp\", replacement: \"\\\\mp\", options: \"m\"},\n    {trigger: \"...\", replacement: \"\\\\dots\", options: \"mA\"},\n    {trigger: \"<->\", replacement: \"\\\\leftrightarrow \", options: \"mA\"},\n    {trigger: \"->\", replacement: \"\\\\to\", options: \"mA\"},\n    {trigger: \"!>\", replacement: \"\\\\mapsto\", options: \"mA\"},\n    {trigger: \"invs\", replacement: \"^{-1}\", options: \"mA\"},\n    {trigger: \"\\\\\\\\\\\\\", replacement: \"\\\\setminus\", options: \"mA\"},\n    {trigger: \"||\", replacement: \"\\\\mid\", options: \"mA\"},\n    {trigger: \"and\", replacement: \"\\\\cap\", options: \"mA\"},\n    {trigger: \"orr\", replacement: \"\\\\cup\", options: \"mA\"},\n    {trigger: \"inn\", replacement: \"\\\\in\", options: \"mA\"},\n    {trigger: \"\\\\subset eq\", replacement: \"\\\\subseteq\", options: \"mA\"},\n    {trigger: \"set\", replacement: \"\\\\{ $0 \\\\}$1\", options: \"mA\"},\n    {trigger: \"=>\", replacement: \"\\\\implies\", options: \"mA\"},\n    {trigger: \"=<\", replacement: \"\\\\impliedby\", options: \"mA\"},\n    {trigger: \"iff\", replacement: \"\\\\iff\", options: \"mA\"},\n    {trigger: \"e\\\\xi sts\", replacement: \"\\\\exists\", options: \"mA\", priority: 1},\n    {trigger: \"===\", replacement: \"\\\\equiv\", options: \"mA\"},\n    {trigger: \"Sq\", replacement: \"\\\\square\", options: \"mA\"},\n    {trigger: \"!=\", replacement: \"\\\\neq\", options: \"mA\"},\n    {trigger: \">=\", replacement: \"\\\\geq\", options: \"mA\"},\n    {trigger: \"<=\", replacement: \"\\\\leq\", options: \"mA\"},\n    {trigger: \">>\", replacement: \"\\\\gg\", options: \"mA\"},\n    {trigger: \"<<\", replacement: \"\\\\ll\", options: \"mA\"},\n    {trigger: \"~~\", replacement: \"\\\\sim\", options: \"mA\"},\n    {trigger: \"\\\\sim ~\", replacement: \"\\\\approx\", options: \"mA\"},\n    {trigger: \"prop\", replacement: \"\\\\propto\", options: \"mA\"},\n    {trigger: \"nabl\", replacement: \"\\\\nabla\", options: \"mA\"},\n    {trigger: \"del\", replacement: \"\\\\nabla\", options: \"mA\"},\n    {trigger: \"xx\", replacement: \"\\\\times\", options: \"mA\"},\n    {trigger: \"**\", replacement: \"\\\\cdot\", options: \"mA\"},\n    {trigger: \"pal\", replacement: \"\\\\parallel\", options: \"mA\"},\n\n\n    {trigger: \"xnn\", replacement: \"x_{n}\", options: \"mA\"},\n    {trigger: \"xii\", replacement: \"x_{i}\", options: \"mA\"},\n    {trigger: \"xjj\", replacement: \"x_{j}\", options: \"mA\"},\n    {trigger: \"xp1\", replacement: \"x_{n+1}\", options: \"mA\"},\n    {trigger: \"ynn\", replacement: \"y_{n}\", options: \"mA\"},\n    {trigger: \"yii\", replacement: \"y_{i}\", options: \"mA\"},\n    {trigger: \"yjj\", replacement: \"y_{j}\", options: \"mA\"},\n\n\n    {trigger: \"mcal\", replacement: \"\\\\mathcal{$0}$1\", options: \"mA\"},\n    {trigger: \"mbb\", replacement: \"\\\\mathbb{$0}$1\", options: \"mA\"},\n    {trigger: \"ell\", replacement: \"\\\\ell\", options: \"mA\"},\n    {trigger: \"lll\", replacement: \"\\\\ell\", options: \"mA\"},\n    {trigger: \"LL\", replacement: \"\\\\mathcal{L}\", options: \"mA\"},\n    {trigger: \"HH\", replacement: \"\\\\mathcal{H}\", options: \"mA\"},\n    {trigger: \"CC\", replacement: \"\\\\mathbb{C}\", options: \"mA\"},\n    {trigger: \"RR\", replacement: \"\\\\mathbb{R}\", options: \"mA\"},\n    {trigger: \"ZZ\", replacement: \"\\\\mathbb{Z}\", options: \"mA\"},\n    {trigger: \"NN\", replacement: \"\\\\mathbb{N}\", options: \"mA\"},\n    {trigger: \"II\", replacement: \"\\\\mathbb{1}\", options: \"mA\"},\n    {trigger: \"\\\\mathbb{1}I\", replacement: \"\\\\hat{\\\\mathbb{1}}\", options: \"mA\"},\n    {trigger: \"AA\", replacement: \"\\\\mathcal{A}\", options: \"mA\"},\n    {trigger: \"BB\", replacement: \"\\\\mathbf{B}\", options: \"mA\"},\n    {trigger: \"EE\", replacement: \"\\\\mathbf{E}\", options: \"mA\"},\n\n\n\n    // Unit vectors\n    {trigger: \":i\", replacement: \"\\\\mathbf{i}\", options: \"mA\"},\n    {trigger: \":j\", replacement: \"\\\\mathbf{j}\", options: \"mA\"},\n    {trigger: \":k\", replacement: \"\\\\mathbf{k}\", options: \"mA\"},\n    {trigger: \":x\", replacement: \"\\\\hat{\\\\mathbf{x}}\", options: \"mA\"},\n    {trigger: \":y\", replacement: \"\\\\hat{\\\\mathbf{y}}\", options: \"mA\"},\n    {trigger: \":z\", replacement: \"\\\\hat{\\\\mathbf{z}}\", options: \"mA\"},\n\n\n\n    // Derivatives\n    {trigger: \"par\", replacement: \"\\\\frac{ \\\\partial ${0:y} }{ \\\\partial ${1:x} } $2\", options: \"m\"},\n    {trigger: \"pa2\", replacement: \"\\\\frac{ \\\\partial^{2} ${0:y} }{ \\\\partial ${1:x}^{2} } $2\", options: \"mA\"},\n    {trigger: \"pa3\", replacement: \"\\\\frac{ \\\\partial^{3} ${0:y} }{ \\\\partial ${1:x}^{3} } $2\", options: \"mA\"},\n    {trigger: \"pa([A-Za-z])([A-Za-z])\", replacement: \"\\\\frac{ \\\\partial [[0]] }{ \\\\partial [[1]] } \", options: \"rm\"},\n    {trigger: \"pa([A-Za-z])([A-Za-z])([A-Za-z])\", replacement: \"\\\\frac{ \\\\partial^{2} [[0]] }{ \\\\partial [[1]] \\\\partial [[2]] } \", options: \"rm\"},\n    {trigger: \"pa([A-Za-z])([A-Za-z])2\", replacement: \"\\\\frac{ \\\\partial^{2} [[0]] }{ \\\\partial [[1]]^{2} } \", options: \"rmA\"},\n    {trigger: \"de([A-Za-z])([A-Za-z])\", replacement: \"\\\\frac{ d[[0]] }{ d[[1]] } \", options: \"rm\"},\n    {trigger: \"de([A-Za-z])([A-Za-z])2\", replacement: \"\\\\frac{ d^{2}[[0]] }{ d[[1]]^{2} } \", options: \"rmA\"},\n    {trigger: \"ddt\", replacement: \"\\\\frac{d}{dt} \", options: \"mA\"},\n\n\n\n    // Integrals\n    {trigger: \"oinf\", replacement: \"\\\\int_{0}^{\\\\infty} $0 \\\\, d${1:x} $2\", options: \"mA\"},\n    {trigger: \"infi\", replacement: \"\\\\int_{-\\\\infty}^{\\\\infty} $0 \\\\, d${1:x} $2\", options: \"mA\"},\n    {trigger: \"dint\", replacement: \"\\\\int_{${0:0}}^{${1:\\\\infty}} $2 \\\\, d${3:x} $4\", options: \"mA\"},\n    {trigger: \"oint\", replacement: \"\\\\oint\", options: \"mA\"},\n    {trigger: \"iiint\", replacement: \"\\\\iiint\", options: \"mA\"},\n    {trigger: \"iint\", replacement: \"\\\\iint\", options: \"mA\"},\n    {trigger: \"int\", replacement: \"\\\\int $0 \\\\, d${1:x} $2\", options: \"mA\"},\n\n\n\n    // Physics\n    {trigger: \"kbt\", replacement: \"k_{B}T\", options: \"mA\"},\n\n\n    // Quantum mechanics\n    {trigger: \"hba\", replacement: \"\\\\hbar\", options: \"mA\"},\n    {trigger: \"dag\", replacement: \"^{\\\\dagger}\", options: \"mA\"},\n    {trigger: \"bra\", replacement: \"\\\\bra{$0} $1\", options: \"mA\"},\n    {trigger: \"ket\", replacement: \"\\\\ket{$0} $1\", options: \"mA\"},\n    {trigger: \"brk\", replacement: \"\\\\braket{ $0 | $1 } $2\", options: \"mA\"},\n    {trigger: \"\\\\\\\\bra{([^|]+)\\\\|\", replacement: \"\\\\braket{ [[0]] | $0 \", options: \"rmA\", description: \"Convert bra into braket\"},\n    {trigger: \"\\\\\\\\bra{(.+)}([^ ]+)>\", replacement: \"\\\\braket{ [[0]] | $0 \", options: \"rmA\", description: \"Convert bra into braket (alternate)\"},\n    {trigger: \"outp\", replacement: \"\\\\ket{${0:\\\\psi}} \\\\bra{${0:\\\\psi}} $1\", options: \"mA\"},\n\n\n\n    // Chemistry\n    {trigger: \"pu\", replacement: \"\\\\pu{ $0 }\", options: \"mA\"},\n    {trigger: \"msun\", replacement: \"M_{\\\\odot}\", options: \"mA\"},\n    {trigger: \"solm\", replacement: \"M_{\\\\odot}\", options: \"mA\"},\n    {trigger: \"ce\", replacement: \"\\\\ce{ $0 }\", options: \"mA\"},\n    {trigger: \"iso\", replacement: \"{}^{${0:4}}_{${1:2}}${2:He}\", options: \"mA\"},\n    {trigger: \"hel4\", replacement: \"{}^{4}_{2}He \", options: \"mA\"},\n    {trigger: \"hel3\", replacement: \"{}^{3}_{2}He \", options: \"mA\"},\n\n\n\n    // Environments\n    {trigger: \"pmat\", replacement: \"\\\\begin{pmatrix}\\n$0\\n\\\\end{pmatrix}\", options: \"mA\"},\n    {trigger: \"bmat\", replacement: \"\\\\begin{bmatrix}\\n$0\\n\\\\end{bmatrix}\", options: \"mA\"},\n    {trigger: \"Bmat\", replacement: \"\\\\begin{Bmatrix}\\n$0\\n\\\\end{Bmatrix}\", options: \"mA\"},\n    {trigger: \"vmat\", replacement: \"\\\\begin{vmatrix}\\n$0\\n\\\\end{vmatrix}\", options: \"mA\"},\n    {trigger: \"Vmat\", replacement: \"\\\\begin{Vmatrix}\\n$0\\n\\\\end{Vmatrix}\", options: \"mA\"},\n    {trigger: \"case\", replacement: \"\\\\begin{cases}\\n$0\\n\\\\end{cases}\", options: \"mA\"},\n    {trigger: \"align\", replacement: \"\\\\begin{align}\\n$0\\n\\\\end{align}\", options: \"mA\"},\n    {trigger: \"array\", replacement: \"\\\\begin{array}\\n$0\\n\\\\end{array}\", options: \"mA\"},\n    {trigger: \"matrix\", replacement: \"\\\\begin{matrix}\\n$0\\n\\\\end{matrix}\", options: \"mA\"},\n\n\n\n    // Brackets\n    {trigger: \"avg\", replacement: \"\\\\langle $0 \\\\rangle $1\", options: \"mA\"},\n    {trigger: \"norm\", replacement: \"\\\\lvert $0 \\\\rvert $1\", options: \"mA\", priority: 1},\n    {trigger: \"mod\", replacement: \"|$0|$1\", options: \"mA\"},\n    {trigger: \"(\", replacement: \"(${VISUAL})\", options: \"mA\"},\n    {trigger: \"[\", replacement: \"[${VISUAL}]\", options: \"mA\"},\n    {trigger: \"{\", replacement: \"{${VISUAL}}\", options: \"mA\"},\n    {trigger: \"(\", replacement: \"($0)$1\", options: \"mAw\"},\n    {trigger: \"{\", replacement: \"{$0}$1\", options: \"mAw\"},\n    {trigger: \"[\", replacement: \"[$0]$1\", options: \"mAw\"},\n    {trigger: \"lr(\", replacement: \"\\\\left( $0 \\\\right) $1\", options: \"mA\"},\n    {trigger: \"lr|\", replacement: \"\\\\left| $0 \\\\right| $1\", options: \"mA\"},\n    {trigger: \"lr{\", replacement: \"\\\\left\\\\{ $0 \\\\right\\\\} $1\", options: \"mA\"},\n    {trigger: \"lr[\", replacement: \"\\\\left[ $0 \\\\right] $1\", options: \"mA\"},\n    {trigger: \"lra\", replacement: \"\\\\left< $0 \\\\right> $1\", options: \"mA\"},\n\n\n\n    // Misc\n    {trigger: \"tayl\", replacement: \"${0:f}(${1:x} + ${2:h}) = ${0:f}(${1:x}) + ${0:f}'(${1:x})${2:h} + ${0:f}''(${1:x}) \\\\frac{${2:h}^{2}}{2!} + \\\\dots$3\", options: \"mA\"},\n]";