import {EditorView} from "@codemirror/view"
import {Extension} from "@codemirror/state"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const config = {
  name: "obsidian",
  dark: false,
  background: "var(--background-primary)",
  foreground: "var(--text-normal)",
  selection: "var(--text-selection)",
  cursor: "var(--text-normal)",
  dropdownBackground: "var(--background-primary)",
  dropdownBorder: "var(--background-modifier-border)",
  activeLine: "var(--background-primary)",
  matchingBracket: "var(--background-modifier-accent)",
  keyword: "#d73a49",
  storage: "#d73a49",
  variable: "var(--text-normal)",
  parameter: "var(--text-accent-hover)",
  function: "var(--text-accent-hover)",
  string: "var(--text-accent)",
  constant: "var(--text-accent-hover)",
  type: "var(--text-accent-hover)",
  class: "#6f42c1",
  number: "var(--text-accent-hover)",
  comment: "var(--text-faint)",
  heading: "var(--text-accent-hover)",
  invalid: "var(--text-error)",
  regexp: "#032f62",
}

export const obsidianTheme = EditorView.theme({
  "&": {
    color: config.foreground,
    backgroundColor: config.background,
  },

  ".cm-content": {caretColor: config.cursor},

  "&.cm-focused .cm-cursor": {borderLeftColor: config.cursor},
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, & ::selection": {backgroundColor: config.selection},

  ".cm-panels": {backgroundColor: config.dropdownBackground, color: config.foreground},
  ".cm-panels.cm-panels-top": {borderBottom: "2px solid black"},
  ".cm-panels.cm-panels-bottom": {borderTop: "2px solid black"},

  ".cm-searchMatch": {
    backgroundColor: config.dropdownBackground,
    outline: `1px solid ${config.dropdownBorder}`
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: config.selection
  },

  ".cm-activeLine": {backgroundColor: config.activeLine},
  ".cm-activeLineGutter": {backgroundColor: config.background},
  ".cm-selectionMatch": {backgroundColor: config.selection},

  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: config.matchingBracket,
    outline: "none"
  },
  ".cm-gutters": {
    backgroundColor: config.background,
    color: config.comment,
    borderRight: "1px solid var(--background-modifier-border)"
  },
  ".cm-lineNumbers, .cm-gutterElement": {color: "inherit"},

  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: config.foreground
  },

  ".cm-tooltip": {
    border: `1px solid ${config.dropdownBorder}`,
    backgroundColor: config.dropdownBackground,
    color: config.foreground
  },
  ".cm-tooltip.cm-tooltip-autocomplete": {
    "& > ul > li[aria-selected]": {
      background: config.selection,
      color: config.foreground
    }
  },
}, {dark: config.dark})

export const obsidianHighlightStyle = HighlightStyle.define([
  {tag: t.keyword, color: config.keyword},
  {tag: [t.name, t.deleted, t.character, t.macroName], color: config.variable},
  {tag: [t.propertyName], color: config.function},
  {tag: [t.processingInstruction, t.string, t.inserted, t.special(t.string)], color: config.string},
  {tag: [t.function(t.variableName), t.labelName], color: config.function},
  {tag: [t.color, t.constant(t.name), t.standard(t.name)], color: config.constant},
  {tag: [t.definition(t.name), t.separator], color: config.variable},
  {tag: [t.className], color: config.class},
  {tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: config.number},
  {tag: [t.typeName], color: config.type, fontStyle: config.type},
  {tag: [t.operator, t.operatorKeyword], color: config.keyword},
  {tag: [t.url, t.escape, t.regexp, t.link], color: config.regexp},
  {tag: [t.meta, t.comment], color: config.comment},
  {tag: t.strong, fontWeight: "bold"},
  {tag: t.emphasis, fontStyle: "italic"},
  {tag: t.link, textDecoration: "underline"},
  {tag: t.heading, fontWeight: "bold", color: config.heading},
  {tag: [t.atom, t.bool, t.special(t.variableName)], color: config.variable},
  {tag: t.invalid, color: config.invalid},
  {tag: t.strikethrough, textDecoration: "line-through"},
])

export const obsidian: Extension = [
  obsidianTheme,
  syntaxHighlighting(obsidianHighlightStyle),
]
