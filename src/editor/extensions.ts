import {
    keymap,
    highlightSpecialChars,
    drawSelection,
    dropCursor,
    EditorView,
    lineNumbers,
    rectangularSelection
  } from "@codemirror/view";
  import { Extension, EditorState } from "@codemirror/state";
  import { javascript } from "@codemirror/lang-javascript";
  import { indentOnInput, indentUnit, bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
  import { defaultKeymap, indentWithTab, history, historyKeymap } from "@codemirror/commands";
  import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
  import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
  import { lintKeymap } from "@codemirror/lint";
  import { obsidian } from "./obsidian_theme";


  export const basicSetup: Extension[] = [
    lineNumbers(),
    highlightSpecialChars(),
    history(),
    javascript(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    indentUnit.of("    "),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    EditorView.lineWrapping,
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    highlightSelectionMatches(),
    obsidian,
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      indentWithTab,
      ...lintKeymap,
    ]),
  ].filter(ext => ext);