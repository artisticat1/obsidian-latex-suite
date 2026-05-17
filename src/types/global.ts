import { EditorView } from "@codemirror/view";
import { CodeMirrorEditor, Vim } from "./vim_types";

declare global {
	interface Window {
		CodeMirrorAdapter?: {
			Vim?: Vim;
		}
	}
	interface Set<T> {
		difference?: (this: Set<T>, other: Set<T>) => Set<T>;
		intersection?: (this: Set<T>, other: Set<T>) => Set<T>;
	}
}

declare module "obsidian" {
	interface App {
		isVimEnabled?: () => boolean;
	}
	interface Editor {
		cm: EditorView
	}
}

declare module "@codemirror/view" {
	interface EditorView {
		cm?: CodeMirrorEditor
	}
}
