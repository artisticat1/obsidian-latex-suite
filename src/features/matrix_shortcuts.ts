
import { EditorView } from "@codemirror/view";
import { isInsideEnvironment } from "src/editor_helpers";
import { setCursor } from "src/editor_helpers";


export const runMatrixShortcuts = (view: EditorView, key: string, shiftKey: boolean, pos: number, matrixShortcutsEnvNames: string[]):boolean => {

    // Check whether we are inside a matrix / align / case environment
    let isInsideAnEnv = false;

    for (const envName of matrixShortcutsEnvNames) {
        const env = {openSymbol: "\\begin{" + envName + "}", closeSymbol: "\\end{" + envName + "}"};

        isInsideAnEnv = isInsideEnvironment(view, pos, env);
        if (isInsideAnEnv) break;
    }

    if (!isInsideAnEnv) return false;


    if (key === "Tab") {
        view.dispatch(view.state.replaceSelection(" & "));

        return true;
    }
    else if (key === "Enter") {
        if (shiftKey) {
            // Move cursor to end of next line
            const d = view.state.doc;

            const nextLineNo = d.lineAt(pos).number + 1;
            const nextLine = d.line(nextLineNo);

            setCursor(view, nextLine.to);
        }
        else {
            view.dispatch(view.state.replaceSelection(" \\\\\n"));
        }

        return true;
    }
    else {
        return false;
    }

}
