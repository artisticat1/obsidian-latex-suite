import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Plugin } from "obsidian";

/**
 * @public
 * @since 1.12.0
 */
export interface LatexSuitePluginPublicApi extends Plugin{
	/**
	 * @public
	 * @since 1.0.0
	 */
	editorExtensions: Extension[];
	/**
	 * @public
	 * @since 1.12.0
	 */
	disableMath: (view: EditorView) => void;
}
