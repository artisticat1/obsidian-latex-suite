// Taken from vimtex
// https://github.com/lervag/vimtex/blob/master/autoload/vimtex/syntax/core.vim


export const cmd_symbols:{[name:string]: string} =
{
	"aleph": "ℵ",
	"amalg": "∐",
	"angle": "∠",
	"approx": "≈",
	"ast": "∗",
	"asymp": "≍",
	"backslash": "∖",
	"bigcap": "∩",
	"bigcirc": "○",
	"bigcup": "∪",
	"bigodot": "⊙",
	"bigoplus": "⊕",
	"bigotimes": "⊗",
	"bigsqcup": "⊔",
	"bigtriangledown": "∇",
	"bigtriangleup": "∆",
	"bigvee": "⋁",
	"bigwedge": "⋀",
	"bot": "⊥",
	"bowtie": "⋈",
	"bullet": "•",
	"cap": "∩",
	"cdots": "⋯",
	"cdot": "·",
	"circ": "∘",
	"clubsuit": "♣",
	"cong": "≅",
	"coprod": "∐",
	"copyright": "©",
	"cup": "∪",
	"dagger": "†",
	"dashv": "⊣",
	"ddagger": "‡",
	"ddots": "⋱",
	"diamond": "⋄",
	"diamondsuit": "♢",
	"div": "÷",
	"doteq": "≐",
	"dots": "…",
	"downarrow": "↓",
	"Downarrow": "⇓",
	"ell": "ℓ",
	"emptyset": "Ø",
	"equiv": "≡",
	"exists": "∃",
	"flat": "♭",
	"forall": "∀",
	"frown": "⁔",
	"geqslant": "≥",
	"geq": "≥",
	"gets": "←",
	"ge": "≥",
	"gg": "⟫",
	"hbar": "ℏ",
	"heartsuit": "♡",
	"hookleftarrow": "↩",
	"hookrightarrow": "↪",
	"iff": "⇔",
	"Im": "ℑ",
	"imath": "ɩ",
	"infty": "∞",
	"iiint": "∭",
	"iint": "∬",
	"int": "∫",
	"in": "∈",
	"jmath": "𝚥",
	"land": "∧",
	"lnot": "¬",
	"lceil": "⌈",
	"ldots": "…",
	// "leftarrow": "←", // Duplicates
	// "Leftarrow": "⇐",
	"leftharpoondown": "↽",
	"leftharpoonup": "↼",
	"leftrightarrow": "↔",
	"Leftrightarrow": "⇔",
	"lhd": "◁",
	"rhd": "▷",
	"leftarrow": "←",
	"Leftarrow": "⇐",
	"left": "",
	"leq": "≤",
	"le": "≤",
	"ll": "≪",
	"lmoustache": "╭",
	"lor": "∨",
	"mapsto": "↦",
	"middle": "",
	"mid": "∣",
	"models": "⊨",
	"mp": "∓",
	"nabla": "∇",
	"natural": "♮",
	"nearrow": "↗",
	"neg": "¬",
	"neqslant": "≠",
	"neq": "≠",
	"ne": "≠",
	"ni": "∋",
	"notin": "∉",
	"nwarrow": "↖",
	"odot": "⊙",
	"oint": "∮",
	"ominus": "⊖",
	"oplus": "⊕",
	"oslash": "⊘",
	"otimes": "⊗",
	"owns": "∋",
	"P": "¶",
	"parallel": "║",
	"partial": "∂",
	"perp": "⊥",
	"pm": "±",
	"preceq": "⪯",
	"prec": "≺",
	"prime": "′",
	"prod": "∏",
	"propto": "∝",
	"rceil": "⌉",
	"Re": "ℜ",
	"qquad": " ",
	"quad": " ",
	"rightarrow": "→",
	"Rightarrow": "⇒",
	"right": "",
	"rightleftharpoons": "⇌",
	"rmoustache": "╮",
	"S": "§",
	"searrow": "↘",
	"setminus": "⧵",
	"sharp": "♯",
	"simeq": "⋍",
	"sim": "∼",
	"smile": "‿",
	"spadesuit": "♠",
	"sqcap": "⊓",
	"sqcup": "⊔",
	"sqsubseteq": "⊑",
	"sqsubset": "⊏",
	"sqsupseteq": "⊒",
	"sqsupset": "⊐",
	"square": "□", // ▢◻
	"star": "✫",
	"subseteq": "⊆",
	"subset": "⊂",
	"succeq": "⪰",
	"succ": "≻",
	"sum\\limits": "∑",
	"sum": "∑",
	"lim\\limits": "lim",
	"supseteq": "⊇",
	"supset": "⊃",
	"surd": "√",
	"swarrow": "↙",
	"times": "×",
	"top": "⊤",
	"to": "→",
	"triangleleft": "⊲",
	"triangleright": "⊳",
	"triangle": "∆",
	"uparrow": "↑",
	"Uparrow": "⇑",
	"updownarrow": "↕",
	"Updownarrow": "⇕",
	"vdash": "⊢",
	"vdots": "⋮",
	"vee": "∨",
	"wedge": "∧",
	"wp": "℘",
	"wr": "≀",
	"implies": "⇒",
	"choose": "C",
	"sqrt": "√",
	"coloneqq": "≔",
	"colon": ":",

	"displaystyle": " ",
	",": " ",
	":": " ",
	";": " "
};


export const operators:string[] =
// From https://www.overleaf.com/learn/latex/Operators
[
	"arcsin",
	"arccos",
	"arctan",
	"sinh",
	"cosh",
	"tanh",
	"coth",
	"sin",
	"cos",
	"tan",
	"sec",
	"csc",
	"cot",
	"exp",
	"ker",
	"limsup",
	"lim",
	"sup",
	"deg",
	"gcd",
	"log",
	"lg",
	"ln",
	"Pr",
	"det",
	"hom",
	"arg",
	"dim",
	"liminf",
	"min",
	"max",
	// "inf" // Fix "\\infty" being concealed as "inf∞"
	];


export const fractions: { [name: string]: string } = {
	"{1}{2}": "½",
	"{1}{3}": "⅓",
	"{2}{3}": "⅔",
	"{1}{4}": "¼",
	"{1}{5}": "⅕",
	"{2}{5}": "⅖",
	"{3}{5}": "⅗",
	"{4}{5}": "⅘",
	"{1}{6}": "⅙",
	"{5}{6}": "⅚",
	"{1}{8}": "⅛",
	"{3}{8}": "⅜",
	"{5}{8}": "⅝",
	"{7}{8}": "⅞",
};


export const greek:{[name: string]:string} =
{
	"alpha":      "α",
	"beta":       "β",
	"gamma":      "γ",
	"delta":      "δ",
	"epsilon":    "ϵ",
	"varepsilon": "ε",
	"zeta":       "ζ",
	"eta":        "η",
	"theta":      "θ",
	"vartheta":   "ϑ",
	"iota":       "ι",
	"kappa":      "κ",
	"lambda":     "λ",
	"mu":         "μ",
	"nu":         "ν",
	"xi":         "ξ",
	"pi":         "π",
	"varpi":      "ϖ",
	"rho":        "ρ",
	"varrho":     "ϱ",
	"sigma":      "σ",
	"varsigma":   "ς",
	"tau":        "τ",
	"upsilon":    "υ",
	"phi":        "ϕ",
	"varphi":     "φ",
	"chi":        "χ",
	"psi":        "ψ",
	"omega":      "ω",
	"Gamma":      "Γ",
	"Delta":      "Δ",
	"Theta":      "Θ",
	"Lambda":     "Λ",
	"Xi":         "Ξ",
	"Pi":         "Π",
	"Sigma":      "Σ",
	"Upsilon":    "Υ",
	"Phi":        "Φ",
	"Chi":        "Χ",
	"Psi":        "Ψ",
	"Omega":      "Ω"
};




export const map_super:{[name: string]:string} = {
	"(":  "⁽",
	")":  "⁾",
	"+":  "⁺",
	"-":  "⁻",
	"=":  "⁼",
	":":  "︓",
	";":  "︔",
	"<":  "˂",
	">":  "˃",
	"0":  "⁰",
	"1":  "¹",
	"2":  "²",
	"3":  "³",
	"4":  "⁴",
	"5":  "⁵",
	"6":  "⁶",
	"7":  "⁷",
	"8":  "⁸",
	"9":  "⁹",
	"a":  "ᵃ",
	"b":  "ᵇ",
	"c":  "ᶜ",
	"d":  "ᵈ",
	"e":  "ᵉ",
	"f":  "ᶠ",
	"g":  "ᵍ",
	"h":  "ʰ",
	"i":  "ⁱ",
	"j":  "ʲ",
	"k":  "ᵏ",
	"l":  "ˡ",
	"m":  "ᵐ",
	"n":  "ⁿ",
	"o":  "ᵒ",
	"p":  "ᵖ",
	"r":  "ʳ",
	"s":  "ˢ",
	"t":  "ᵗ",
	"u":  "ᵘ",
	"v":  "ᵛ",
	"w":  "ʷ",
	"x":  "ˣ",
	"y":  "ʸ",
	"z":  "ᶻ",
	"A":  "ᴬ",
	"B":  "ᴮ",
	"D":  "ᴰ",
	"E":  "ᴱ",
	"G":  "ᴳ",
	"H":  "ᴴ",
	"I":  "ᴵ",
	"J":  "ᴶ",
	"K":  "ᴷ",
	"L":  "ᴸ",
	"M":  "ᴹ",
	"N":  "ᴺ",
	"O":  "ᴼ",
	"P":  "ᴾ",
	"R":  "ᴿ",
	"T":  "ᵀ",
	"U":  "ᵁ",
	"V":  "ⱽ",
	"W":  "ᵂ",
};




export const map_sub =
{
	// "\\beta":  "ᵦ",
	// "\\rho":   "ᵨ",
	// "\\phi":   "ᵩ",
	// "\\gamma": "ᵧ",
	// "\\chi":   "ᵪ",
	"(":       "₍",
	")":       "₎",
	"+":       "₊",
	"-":       "₋",
	"=":       "₌",
	"0":       "₀",
	"1":       "₁",
	"2":       "₂",
	"3":       "₃",
	"4":       "₄",
	"5":       "₅",
	"6":       "₆",
	"7":       "₇",
	"8":       "₈",
	"9":       "₉",
	"a":       "ₐ",
	"e":       "ₑ",
	"h":       "ₕ",
	"i":       "ᵢ",
	"j":       "ⱼ",
	"k":       "ₖ",
	"l":       "ₗ",
	"m":       "ₘ",
	"n":       "ₙ",
	"o":       "ₒ",
	"p":       "ₚ",
	"r":       "ᵣ",
	"s":       "ₛ",
	"t":       "ₜ",
	"u":       "ᵤ",
	"v":       "ᵥ",
	"x":       "ₓ",
};


export const bar = {
	"a": "ā",
	"e": "ē",
	"g": "ḡ",
	"i": "ī",
	"o": "ō",
	"u": "ū",
	"A": "Ā",
	"E": "Ē",
	"G": "Ḡ",
	"I": "Ī",
	"O": "Ō",
	"U": "Ū",
}


export const dot = {
	"A": "Ȧ",
	"a": "ȧ",
	"B": "Ḃ",
	"b": "ḃ",
	"C": "Ċ",
	"c": "ċ",
	"D": "Ḋ",
	"d": "ḋ",
	"E": "Ė",
	"e": "ė",
	"F": "Ḟ",
	"f": "ḟ",
	"G": "Ġ",
	"g": "ġ",
	"H": "Ḣ",
	"h": "ḣ",
	"I": "İ",
	"M": "Ṁ",
	"m": "ṁ",
	"N": "Ṅ",
	"n": "ṅ",
	"O": "Ȯ",
	"o": "ȯ",
	"P": "Ṗ",
	"p": "ṗ",
	"R": "Ṙ",
	"r": "ṙ",
	"S": "Ṡ",
	"s": "ṡ",
	"T": "Ṫ",
	"t": "ṫ",
	"W": "Ẇ",
	"w": "ẇ",
	"X": "Ẋ",
	"x": "ẋ",
	"Y": "Ẏ",
	"y": "ẏ",
	"Z": "Ż",
	"z": "ż",
}


export const hat = {
	"a": "â",
	"A": "Â",
	"c": "ĉ",
	"C": "Ĉ",
	"e": "ê",
	"E": "Ê",
	"g": "ĝ",
	"G": "Ĝ",
	"i": "î",
	"I": "Î",
	"o": "ô",
	"O": "Ô",
	"s": "ŝ",
	"S": "Ŝ",
	"u": "û",
	"U": "Û",
	"w": "ŵ",
	"W": "Ŵ",
	"y": "ŷ",
	"Y": "Ŷ",
}



export const brackets = {
	// "left(": "(",
	// "left[": "[",
	// "left\\{": "\\{",
	// "right)": ")",
	// "right]": "]",
	// "right\\}": "\\}",
	// "left\\langle": "〈",
	// "right\\rangle": "〉",

	"left<": "〈",
	"right>": "〉",
	"langle": "〈",
	"rangle": "〉",
	"lvert": "|",
	"rvert": "|",
	"vert": "|"
}



export const mathbb = {
	" ": " ",
	"0": "𝟘",
	"1": "𝟙",
	"2": "𝟚",
	"3": "𝟛",
	"4": "𝟜",
	"5": "𝟝",
	"6": "𝟞",
	"7": "𝟟",
	"8": "𝟠",
	"9": "𝟡",
	"A": "𝔸",
	"B": "𝔹",
	"C": "ℂ",
	"D": "𝔻",
	"E": "𝔼",
	"F": "𝔽",
	"G": "𝔾",
	"H": "ℍ",
	"I": "𝕀",
	"J": "𝕁",
	"K": "𝕂",
	"L": "𝕃",
	"M": "𝕄",
	"N": "ℕ",
	"O": "𝕆",
	"P": "ℙ",
	"Q": "ℚ",
	"R": "ℝ",
	"S": "𝕊",
	"T": "𝕋",
	"U": "𝕌",
	"V": "𝕍",
	"W": "𝕎",
	"X": "𝕏",
	"Y": "𝕐",
	"Z": "ℤ",
	"a": "𝕒",
	"b": "𝕓",
	"c": "𝕔",
	"d": "𝕕",
	"e": "𝕖",
	"f": "𝕗",
	"g": "𝕘",
	"h": "𝕙",
	"i": "𝕚",
	"j": "𝕛",
	"k": "𝕜",
	"l": "𝕝",
	"m": "𝕞",
	"n": "𝕟",
	"o": "𝕠",
	"p": "𝕡",
	"q": "𝕢",
	"r": "𝕣",
	"s": "𝕤",
	"t": "𝕥",
	"u": "𝕦",
	"v": "𝕧",
	"w": "𝕨",
	"x": "𝕩",
	"y": "𝕪",
	"z": "𝕫",
}


export const mathscrcal = {
	"A": "𝓐",
	"B": "𝓑",
	"C": "𝓒",
	"D": "𝓓",
	"E": "𝓔",
	"F": "𝓕",
	"G": "𝓖",
	"H": "𝓗",
	"I": "𝓘",
	"J": "𝓙",
	"K": "𝓚",
	"L": "𝓛",
	"M": "𝓜",
	"N": "𝓝",
	"O": "𝓞",
	"P": "𝓟",
	"Q": "𝓠",
	"R": "𝓡",
	"S": "𝓢",
	"T": "𝓣",
	"U": "𝓤",
	"V": "𝓥",
	"W": "𝓦",
	"X": "𝓧",
	"Y": "𝓨",
	"Z": "𝓩",
}



export const mathfrak = {
	"a": "𝔞",
	"b": "𝔟",
	"c": "𝔠",
	"d": "𝔡",
	"e": "𝔢",
	"f": "𝔣",
	"g": "𝔤",
	"h": "𝔥",
	"i": "𝔦",
	"j": "𝔧",
	"k": "𝔨",
	"l": "𝔩",
	"m": "𝔪",
	"n": "𝔫",
	"o": "𝔬",
	"p": "𝔭",
	"q": "𝔮",
	"r": "𝔯",
	"s": "𝔰",
	"t": "𝔱",
	"u": "𝔲",
	"v": "𝔳",
	"w": "𝔴",
	"x": "𝔵",
	"y": "𝔶",
	"z": "𝔷",
	"A": "𝔄",
	"B": "𝔅",
	"C": "ℭ",
	"D": "𝔇",
	"E": "𝔈",
	"F": "𝔉",
	"G": "𝔊",
	"H": "ℌ",
	"I": "ℑ",
	"J": "𝔍",
	"K": "𝔎",
	"L": "𝔏",
	"M": "𝔐",
	"N": "𝔑",
	"O": "𝔒",
	"P": "𝔓",
	"Q": "𝔔",
	"R": "ℜ",
	"S": "𝔖",
	"T": "𝔗",
	"U": "𝔘",
	"V": "𝔙",
	"W": "𝔚",
	"X": "𝔛",
	"Y": "𝔜",
	"Z": "ℨ",
}