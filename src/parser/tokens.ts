/* Hand-written tokenizer for LaTeX. */

import { ExternalTokenizer, ContextTracker, InputStream } from "@lezer/lr"

import {
  LiteralArgContent,
  VerbContent,
  Begin,
  End,
  KnownEnvironment,
  Csname,
  RefCtrlSeq,
  RefStarrableCtrlSeq,
  LabelCtrlSeq,
  MathTextCtrlSeq,
  HboxCtrlSeq,
  HrefCtrlSeq,
  VerbCtrlSeq,
  DefCtrlSeq,
  LetCtrlSeq,
  LeftCtrlSeq,
  RightCtrlSeq,
  NewCommandCtrlSeq,
  RenewCommandCtrlSeq,
  NewEnvironmentCtrlSeq,
  RenewEnvironmentCtrlSeq,
  EquationEnvName,
  EquationArrayEnvName,
  OpenParenCtrlSym,
  CloseParenCtrlSym,
  OpenBracketCtrlSym,
  CloseBracketCtrlSym,
  LineBreakCtrlSym,
  TextColorCtrlSeq,
  ColorBoxCtrlSeq,
  HLineCtrlSeq,
  TopRuleCtrlSeq,
  MidRuleCtrlSeq,
  BottomRuleCtrlSeq,
  ParBoxCtrlSeq,
  // Marker for end of argument lists
  endOfArguments,
  hasMoreArguments,
  hasMoreArgumentsOrOptionals,
  endOfArgumentsAndOptionals,
  TextBoldCtrlSeq,
  TextItalicCtrlSeq,
  TextTeletypeCtrlSeq,
  TextSansSerifCtrlSeq,
  EmphasisCtrlSeq,
  UnderlineCtrlSeq,
} from "./latex-parser.terms"

const MAX_ARGUMENT_LOOKAHEAD = 100

function nameChar(ch: number) {
  // we accept A-Z a-z 0-9 * + @ in environment names
  return (
    (ch >= 65 && ch <= 90) ||
    (ch >= 97 && ch <= 122) ||
    (ch >= 48 && ch <= 57) ||
    ch === 42 ||
    ch === 43 ||
    ch === 64
  )
}

// match [a-zA-Z]
function alphaChar(ch: number) {
  return (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122)
}

let cachedName: null | string = null
let cachedInput: null | InputStream = null
let cachedPos = 0
function envNameAfter(input: InputStream, offset: number): string | null {
  const pos = input.pos + offset
  if (cachedInput === input && cachedPos === pos) {
    return cachedName
  }
  if (input.peek(offset) !== "{".charCodeAt(0)) return null
  offset++
  let name = ""
  for (; ;) {
    const next = input.peek(offset)
    if (!nameChar(next)) break
    name += String.fromCharCode(next)
    offset++
  }
  cachedInput = input
  cachedPos = pos
  return (cachedName = name || null)
}

class ElementContext {
	name: string;
	parent: ElementContext | null;
	hash: number;
	constructor(name: string, parent: ElementContext | null) {
		this.name = name;
		this.parent = parent;
		this.hash = parent ? parent.hash : 0;
		for (let i = 0; i < name.length; i++)
			this.hash +=
				(this.hash << 4) +
				name.charCodeAt(i) +
				(name.charCodeAt(i) << 8);
	}
}

export const elementContext = new ContextTracker<ElementContext | null>({
  start: null,
  shift(context, term, stack, input) {
    return term === Begin
      ? new ElementContext(envNameAfter(input, "\\begin".length) || "", context)
      : context
  },
  reduce(context, term) {
    return term === KnownEnvironment && context ? context.parent : context;
  },
  reuse(context, node, _stack, input) {
    const type = node.type.id
    return type === Begin
      ? new ElementContext(envNameAfter(input, 0) || "", context)
      : context
  },
  hash(context) {
    return context ? context.hash : 0
  },
  strict: false,
})

// tokenizer for \verb|...| commands
export const verbTokenizer = new ExternalTokenizer(
  (input, stack) => {
    if (input.next === "*".charCodeAt(0)) input.advance()
    const delimiter = input.next
    if (delimiter === -1) return // hit end of file
    if (/\s|\*/.test(String.fromCharCode(delimiter))) return // invalid delimiter
    input.advance()
    for (; ;) {
      const next = input.next
      if (next === -1 || next === CHAR_NEWLINE) return
      input.advance()
      if (next === delimiter) break
    }
    return input.acceptToken(VerbContent)
  },
  { contextual: false }
)

// tokenizer for \href{...} and similar commands
export const literalArgTokenizer = new ExternalTokenizer(
  input => {
    for (let offset = 0; ; offset++) {
      const next = input.peek(offset)
      if (next === -1 || next === CHAR_CLOSE_BRACE) {
        return input.acceptToken(LiteralArgContent, offset)
      }
    }
  },
  { contextual: false }
)

// helper function to look up charCodes
function _char(s: string) {
  return s.charCodeAt(0)
}

const CHAR_BACKSLASH = _char("\\")
const CHAR_OPEN_BRACE = _char("{")
const CHAR_OPEN_BRACKET = _char("[")
const CHAR_CLOSE_BRACE = _char("}")
const CHAR_TAB = _char("\t")
const CHAR_SPACE = _char(" ")
const CHAR_NEWLINE = _char("\n")

const lookaheadTokenizer = (getToken: (next: number) => number) =>
  new ExternalTokenizer(
    input => {
      for (let i = 0; i < MAX_ARGUMENT_LOOKAHEAD; ++i) {
        const next = input.peek(i)
        if (next === CHAR_SPACE || next === CHAR_TAB) {
          continue
        }
        const token = getToken(next)
        if (token) {
          input.acceptToken(token)
          return
        }
      }
    },
    { contextual: false, fallback: true }
  )

export const argumentListTokenizer = lookaheadTokenizer(next => {
  if (next === CHAR_OPEN_BRACE) {
    return hasMoreArguments
  } else {
    return endOfArguments
  }
})

export const argumentListWithOptionalTokenizer = lookaheadTokenizer(next => {
  if (next === CHAR_OPEN_BRACE || next === CHAR_OPEN_BRACKET) {
    return hasMoreArgumentsOrOptionals
  } else {
    return endOfArgumentsAndOptionals
  }
})

const CHAR_AT_SYMBOL = _char("@")

export const csnameTokenizer = new ExternalTokenizer((input, stack) => {
  let offset = 0
  let end = -1
  // look at the first character, we are looking for acceptable control sequence names
  // including @ signs, \\[a-zA-Z@]+
  const next = input.peek(offset)
  if (next === -1) {
    return
  }
  // reject anything not starting with a backslash,
  // we only accept control sequences
  if (next !== CHAR_BACKSLASH) {
    return
  }
  offset++
  for (; ;) {
    const next = input.peek(offset)
    // stop when we reach the end of file or a non-csname character
    if (next === -1 || !(alphaChar(next) || next === CHAR_AT_SYMBOL)) {
      end = offset - 1
      break
    }
    end = offset
    offset++
  }
  if (end === -1) return
  // accept the content as a valid control sequence
  return input.acceptToken(Csname, end + 1)
})

const refCommands = new Set([
  "\\eqref",
])

const refStarrableCommands = new Set([
  "\\ref",
])

const labelCommands = new Set([
	"\\label",
]);

const mathTextCommands = new Set([
	"\\text",
	"\\tag",
	"\\textrm",
]);

const otherKnowncommands = {
  "\\hbox": HboxCtrlSeq,
  "\\href": HrefCtrlSeq,
  "\\verb": VerbCtrlSeq,
  "\\def": DefCtrlSeq,
  "\\let": LetCtrlSeq,
  "\\left": LeftCtrlSeq,
  "\\right": RightCtrlSeq,
  "\\newcommand": NewCommandCtrlSeq,
  "\\renewcommand": RenewCommandCtrlSeq,
  "\\newenvironment": NewEnvironmentCtrlSeq,
  "\\renewenvironment": RenewEnvironmentCtrlSeq,
  "\\textcolor": TextColorCtrlSeq,
  "\\colorbox": ColorBoxCtrlSeq,
  "\\hline": HLineCtrlSeq,
  "\\toprule": TopRuleCtrlSeq,
  "\\midrule": MidRuleCtrlSeq,
  "\\bottomrule": BottomRuleCtrlSeq,
  "\\parbox": ParBoxCtrlSeq,
  "\\textbf": TextBoldCtrlSeq,
  "\\textit": TextItalicCtrlSeq,
  "\\texttt": TextTeletypeCtrlSeq,
  "\\textsf": TextSansSerifCtrlSeq,
  "\\emph": EmphasisCtrlSeq,
  "\\underline": UnderlineCtrlSeq,
}
// specializer for control sequences
// return new tokens for specific control sequences
export const specializeCtrlSeq = (name: string, terms: string) => {
  if (name === "\\begin") return Begin
  if (name === "\\end") return End
  if (refCommands.has(name)) {
    return RefCtrlSeq
  }
  if (refStarrableCommands.has(name)) {
    return RefStarrableCtrlSeq
  }
  if (labelCommands.has(name)) {
    return LabelCtrlSeq
  }
  if (mathTextCommands.has(name)) {
    return MathTextCtrlSeq
  }
  return otherKnowncommands[name as keyof typeof otherKnowncommands] || -1
}

const equationEnvNames = new Set([
  "equation",
  "equation*",
  "displaymath",
  "math",
  "multline",
  "multline*",
  "matrix",
])

const equationArrayEnvNames = new Set([
  "array",
  "eqnarray",
  "eqnarray*",
  "align",
  "align*",
  "alignat",
  "alignat*",
  "flalign",
  "flalign*",
  "gather",
  "gather*",
  "pmatrix",
  "pmatrix*",
  "bmatrix",
  "bmatrix*",
  "Bmatrix",
  "Bmatrix*",
  "vmatrix",
  "vmatrix*",
  "Vmatrix",
  "Vmatrix*",
  "smallmatrix",
  "smallmatrix*",
  "split",
  "gathered",
  "aligned",
  "alignedat",
  "cases",
  "cases*",
  "dcases",
  "dcases*",
  "rcases",
  "rcases*",
])

export const specializeEnvName = (name: string, terms: string) => {
  if (equationEnvNames.has(name)) {
    return EquationEnvName
  }
  if (equationArrayEnvNames.has(name)) {
    return EquationArrayEnvName
  }
  return -1
}

const otherKnownCtrlSyms = {
  "\\(": OpenParenCtrlSym,
  "\\)": CloseParenCtrlSym,
  "\\[": OpenBracketCtrlSym,
  "\\]": CloseBracketCtrlSym,
  "\\\\": LineBreakCtrlSym,
}

export const specializeCtrlSym = (name: string, terms: string) => {
  return otherKnownCtrlSyms[name as keyof typeof otherKnownCtrlSyms] || -1
}
