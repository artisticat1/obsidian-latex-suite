import {
    keymap,
    highlightSpecialChars,
    drawSelection,
    dropCursor,
    EditorView,
  } from "@codemirror/view";
  import { Extension, EditorState } from "@codemirror/state";
  import { history, historyKeymap } from "@codemirror/history";
  import { foldGutter, foldKeymap } from "@codemirror/fold";
  import { javascript } from "@codemirror/lang-javascript";
  import { indentOnInput, indentUnit } from "@codemirror/language";
  import { lineNumbers } from "@codemirror/gutter";
  import { defaultKeymap, indentWithTab } from "@codemirror/commands";
  import { bracketMatching } from "@codemirror/matchbrackets";
  import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
  import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
  import { commentKeymap } from "@codemirror/comment";
  import { rectangularSelection } from "@codemirror/rectangular-selection";
  import { defaultHighlightStyle } from "@codemirror/highlight";
  import { lintKeymap } from "@codemirror/lint";
  import { obsidian } from "./obsidian_theme";


  export const basicSetup: Extension[] = [
    lineNumbers(),
    highlightSpecialChars(),
    history(),
    javascript(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    indentUnit.of("    "),
    defaultHighlightStyle.fallback,
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
      ...foldKeymap,
      ...commentKeymap,
      ...lintKeymap,
    ]),
  ].filter(ext => ext);