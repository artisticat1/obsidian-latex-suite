import { Editor, MarkdownView } from "obsidian";
import { isWithinMath, getEquationBounds } from "./editor_helpers";


function boxCurrentEquation(editor: Editor, pos: number) {
    const result = getEquationBounds(editor, pos);
    if (!result) return false;
    const {start, end} = result;

    const cursor = editor.offsetToPos(pos);
    const startPos = editor.offsetToPos(start+1);
    const endPos = editor.offsetToPos(end);

    let equation = "\\boxed{" + editor.getRange(startPos, endPos) + "}";


    // Insert newlines if we're in a block equation
    const text = editor.getValue();
    const insideBlockEquation = text.slice(start-1, start+1) === "$$" && text.slice(end, end+2) === "$$";

    if (insideBlockEquation) {
        equation = "\n" + equation + "\n";
    }

    editor.replaceRange(equation, startPos, endPos);

    if (insideBlockEquation) {
        editor.setCursor({...cursor, line: cursor.line + 1});
    }
    else {
        editor.setCursor({...cursor, ch: cursor.ch + "\\boxed{".length});
    }
}


function getBoxEquationCommand() {
    return {
        id: "latex-suite-box-equation",
        name: "Box current equation",
        editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {

            const cursor = editor.getCursor("to");
            const pos = editor.posToOffset(cursor);
            const withinMath = isWithinMath(pos-1, editor);


            if (withinMath) {
                if (!checking) {
                    boxCurrentEquation(editor, pos);
                }

                return true;
            }

            return false;
        },
    }
}


function getSelectEquationCommand() {
    return {
        id: "latex-suite-select-equation",
        name: "Select current equation",
        editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {

            const cursor = editor.getCursor("to");
            const pos = editor.posToOffset(cursor);
            const withinMath = isWithinMath(pos-1, editor);


            if (withinMath) {
                if (!checking) {
                    const result = getEquationBounds(editor, pos);
                    if (!result) return false;
                    let {start, end} = result;

                    // Don't include newline characters in the selection
                    if (editor.getValue().charAt(start+1) === "\n") start++;
                    if (editor.getValue().charAt(end-1) === "\n") end--;

                    editor.setSelection(editor.offsetToPos(start+1), editor.offsetToPos(end));
                }

                return true;
            }

            return false;
        },
    }
}


export const editorCommands = [
    getBoxEquationCommand(),
    getSelectEquationCommand()
];