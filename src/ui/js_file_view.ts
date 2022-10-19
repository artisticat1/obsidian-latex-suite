// Reference from https://github.com/dbarenholz/obsidian-plaintext/blob/3795b4cef6b972990c8bed594df568e909c808b0/src/view.ts

import { TextFileView, WorkspaceLeaf } from "obsidian";
import LatexSuitePlugin from "src/main";

export const JSFILE_VIEW_TYPE = "javascript-view"

export class JsfileView extends TextFileView{
    codeMirror: CodeMirror.Editor
    constructor(leaf: WorkspaceLeaf, public plugin: LatexSuitePlugin){
        super(leaf);
        // obsidian internal codemirror instance, so i ignore it
        //@ts-ignore
        this.codeMirror = CodeMirror(this.contentEl, {
            theme: "javascript",
            mode: "javascript",
            addModeClass: true,
            autofocus: true
        })

        this.codeMirror.on("changes", this.changed);
    }

    changed = async () => {
        // request a debounced save in 2 seconds from now
        this.requestSave();
    }

    /**
   * Getter for the data in the view.
   * Called when saving the contents.
   *
   * @returns The file contents as string.
   */
    getViewData(): string {
        return this.codeMirror.getValue();
    }

    /**
   * Setter for the data in the view.
   * Called when loading file contents.
   *
   * If clear is set, then it means we're opening a completely different file.
   * In that case, you should call clear(), or implement a slightly more efficient
   * clearing mechanism given the new data to be set.
   *
   * @param data
   * @param clear
   */
    setViewData(data: string, clear: boolean): void {
        if (clear) {
            //@ts-ignore
            this.codeMirror.swapDoc(CodeMirror.Doc(data, "javascript"));
        } else {
            this.codeMirror.setValue(data);
        }

        // @ts-ignore
        if (this.app?.vault?.config?.vimMode) {
            this.codeMirror.setOption("keyMap", "vim");
        }

        // This seems to fix some odd visual bugs:
        this.codeMirror.refresh();

        // This focuses the editor, which is analogous to the
        // default Markdown behavior in Obsidian:
        this.codeMirror.focus();
    }

    /**
   * Event handler for resizing a view.
   * Refreshes codemirror instance.
   */
    onResize(): void {
        this.codeMirror.refresh();
    }

    /**
   * Clears the current codemirror instance.
   */
    clear(): void {
        this.codeMirror.setValue("");
        this.codeMirror.clearHistory();
    }

    canAcceptExtension(extension: string) {
		return extension === "js";
	}

    /**
   * Returns the viewtype of this codemirror instance.
   * The viewtype is the extension of the file that is opened.
   * 
   * @returns The viewtype (file extension) of this codemirror instance.
   */
    getViewType(): string {
        return JSFILE_VIEW_TYPE;
    }

    /**
   * Returns a string indicating which file is currently open, if any.
   * If no file is open, returns that.
   * 
   * @returns A string indicating the opened file, if any.
   */
    getDisplayText(): string {
        return this.file ? this.file.basename : "js (no file)";
    }
}