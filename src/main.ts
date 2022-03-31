import { Editor, EditorPosition, EditorSelection, editorViewField, MarkdownView, Plugin } from "obsidian";
import { EditorView } from "@codemirror/view";
import { Prec, EditorState } from "@codemirror/state";

import { syntaxTree } from "@codemirror/language";
import { tokenClassNodeProp } from "@codemirror/stream-parser";
import { Tree } from "@lezer/common";

import { posFromIndex, getOpenBracket, getCloseBracket, findMatchingBracket, orientAnchorHead, editorToCodeMirrorState } from "./editor_helpers"
import { DEFAULT_SETTINGS, LatexSuiteSettings, LatexSuiteSettingTab } from "./settings"
import { Environment, Snippet, SNIPPET_VARIABLES } from "./snippets"
import { markerStateField } from "./marker_state_field";
import { SnippetManager } from "./snippet_manager";
import { parse } from "json5";


export default class LatexSuitePlugin extends Plugin {
	settings: LatexSuiteSettings;
	snippets: Snippet[];
	autofractionExcludedEnvs: Environment[];
	matrixShortcutsEnvNames: string[];
	autoEnlargeBracketsTriggers: string[];

	private snippetManager: SnippetManager;
	private cursorTriggeredByChange = false;


	// When expanding snippets
	private shouldAutoEnlargeBrackets = false;


	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LatexSuiteSettingTab(this.app, this));


		this.snippetManager = new SnippetManager();


		this.registerEditorExtension(markerStateField);
		this.registerEditorExtension(Prec.highest(EditorView.domEventHandlers({
            "keydown": this.onKeydown
        })));
		this.registerEditorExtension(EditorView.updateListener.of(update => {
            if (update.docChanged) {
                this.handleDocChange();
            }

            if (update.selectionSet) {
                this.handleCursorActivity(posFromIndex(update.state.doc, update.state.selection.main.head))
            }
        }));


		this.addCommand({
			id: "latex-suite-box-equation",
			name: "Box current equation",
			editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {

				const cursor = editor.getCursor("to");
				const pos = editor.posToOffset(cursor);
				const withinMath = this.checkWithinMath(editorToCodeMirrorState(editor), pos-1, editor);


				if (withinMath) {
					if (!checking) {
						this.boxCurrentEquation(editor, pos);
					}

					return true;
				}

				return false;
			},
		});
	}

	onunload() {
		this.snippetManager.onunload();
	}


	private readonly handleDocChange = () => {
        this.cursorTriggeredByChange = true;
    };

    private readonly handleCursorActivity = (cursor: EditorPosition) => {
        if (this.cursorTriggeredByChange) {
            this.cursorTriggeredByChange = false;
            return;
        }

        if (!this.snippetManager.isInsideATabstop(cursor)) {
            this.snippetManager.clearAllTabstops();
        }
    };


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.setSnippets(this.settings.snippets);
		this.setAutofractionExcludedEnvs(this.settings.autofractionExcludedEnvs);
		this.matrixShortcutsEnvNames = this.settings.matrixShortcutsEnvNames.replace(/\s/g,"").split(",");
		this.autoEnlargeBracketsTriggers = this.settings.autoEnlargeBracketsTriggers.replace(/\s/g,"").split(",");
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	setSnippets(snippets:string) {
		this.snippets = parse(snippets);
	}


	setAutofractionExcludedEnvs(envsStr: string) {
		const envsJSON = JSON.parse(envsStr);
		const envs = envsJSON.map(function(env: string[]) {
			return {openSymbol: env[0], closeSymbol: env[1]};
		});

		this.autofractionExcludedEnvs = envs;
	}


	private readonly boxCurrentEquation = (editor: Editor, pos: number) => {
		const result = this.getEquationBounds(editor, pos);
		if (!result) return false;
		const {start, end} = result;

		const cursor = editor.offsetToPos(pos);
		const startPos = editor.offsetToPos(start+1);
		const endPos = editor.offsetToPos(end);

		const equation = "\n\\boxed{" + editor.getRange(startPos, endPos) + "}\n";

		editor.replaceRange(equation, startPos, endPos);
		editor.setCursor({...cursor, line: cursor.line + 1});
	}



	private readonly checkWithinMath = (state: EditorState, pos: number, editor: Editor):boolean => {

		let tree: Tree = null;
		if (!tree) tree = syntaxTree(state);

		const nodeProps = tree.resolveInner(pos, 1).type.prop(tokenClassNodeProp);

        let withinMath = (nodeProps && /math/.test(nodeProps));

		// Check whether within "\text{}"
        if (withinMath) {
            withinMath = !(this.isInsideEnvironment(editor, pos+1, {openSymbol: "\\text{", closeSymbol: "}"}));
        }

		return withinMath;
	}



	private readonly onKeydown = (event: KeyboardEvent, cm: EditorView) => {
		const view = cm.state.field(editorViewField, false);
		if (!view)
			return;

		const editor = view.editor;
		const cursors = editor.listSelections().map(orientAnchorHead).reverse(); // Last to first

		const cursor = editor.getCursor("to");
		const pos = editor.posToOffset(cursor);
		const withinMath = this.checkWithinMath(cm.state, pos-1, editor);


		let success = false;


		// Snippets
		if (this.settings.snippetsEnabled) {

			success = this.runSnippets(editor, event, withinMath, cursors);

			if (success) {
				return;
			}

		}

		// Tabstops
		if (event.key === "Tab") {
			success = this.handleTabstops(editor, event, cursor);

			if (success) {
				return;
			}
		}


		if (this.settings.autofractionEnabled && withinMath) {
			if (event.key === "/") {
				success = this.runAutoFraction(editor, event, cursors);

				if (success) {
					return;
				}
			}
		}


		if (this.settings.matrixShortcutsEnabled) {
			success = this.runMatrixShortcuts(editor, event, pos);

			if (success) {
				return;
			}
		}


		if (this.settings.taboutEnabled) {
			if (event.key === "Tab") {
				success = this.tabout(editor, event, withinMath);

				if (success) {
					return;
				}
			}
		}
	}



	private readonly checkSnippet = (snippet: Snippet, effectiveLine: string, selection:  EditorSelection, sel: string):{triggerPos: number; replacement: string} => {
		let triggerPos;
		let trigger = snippet.trigger;
		trigger = this.insertSnippetVariables(trigger);

		let replacement = snippet.replacement;


		if (snippet.replacement.contains("${VISUAL}")) {
			// "Visual" snippets
			if (!sel) return null;

			// Check whether the trigger text was typed
			if (!(effectiveLine.slice(-trigger.length) === trigger)) return null;


			triggerPos = selection.anchor.ch;
			replacement = snippet.replacement.replace("${VISUAL}", sel);

		}
		else if (!(snippet.options.contains("r"))) {

			// Check whether the trigger text was typed
			if (!(effectiveLine.slice(-trigger.length) === trigger)) return null;

			triggerPos = effectiveLine.length - trigger.length;

		}
		else {
			// Regex snippet

			const regex = new RegExp(trigger, "g");
			const matches = effectiveLine.matchAll(regex);

			let foundMatch = false;


			for (const match of matches) {
				// Check whether the match occured at the cursor's current position
				// match[0] = the matching string

				if (!((match.index + match[0].length) === effectiveLine.length)) {
					continue;
				}

				// Compute the replacement string
				// match.length - 1 = the number of capturing groups

				for (let i = 1; i < match.length; i++) {
					// i-1 to start from 0
					replacement = replacement.replaceAll("[[" + (i-1) + "]]", match[i]);
				}


				foundMatch = true;
				triggerPos = match.index;
				break;
			}

			if (!(foundMatch)) {
				return null;
			}
		}

		return {triggerPos: triggerPos, replacement: replacement};
	}


	private readonly expandSnippet = (editor: Editor, start:EditorPosition, end: EditorPosition, replacement:string) => {
		editor.replaceRange(replacement, start, end);
	}


	private readonly insertSnippetVariables = (trigger: string) => {

		for (const [variable, replacement] of Object.entries(SNIPPET_VARIABLES)) {
			trigger = trigger.replace(variable, replacement);
		}

		return trigger;
	}



	private readonly runSnippets = (editor: Editor, event: KeyboardEvent, withinMath: boolean, selections: EditorSelection[]):boolean => {
		let append = false;
		this.shouldAutoEnlargeBrackets = false;

		for (const selection of selections) {
			const success = this.runSnippetCursor(editor, event, withinMath, selection, append);

			if (success) {
				append = true;
			}
		}

		if (this.shouldAutoEnlargeBrackets) {
			this.autoEnlargeBrackets(editor);
		}

		return append;
	}


	private readonly runSnippetCursor = (editor: Editor, event: KeyboardEvent, withinMath: boolean, selection: EditorSelection, append:boolean):boolean => {

		const {anchor, head} = selection;
		const sel = editor.getRange(anchor, head);


		const cursor = head;
		const curLine = editor.getRange({line: cursor.line, ch: 0}, cursor);


		for (const snippet of this.snippets) {
			let effectiveLine = curLine;

			if (snippet.options.contains("m") && (!withinMath)) {
                continue;
            }
            else if (snippet.options.contains("t") && (withinMath)) {
                continue;
            }

            if (snippet.options.contains("A") || snippet.replacement.contains("${VISUAL}")) {
                // If the key pressed wasn't a text character, continue
                if (!(event.key.length === 1)) continue;

                effectiveLine += event.key;
            }
            else if (!(event.key === "Tab")) {
                // The snippet must be triggered by the Tab key
                continue;
            }


			const result = this.checkSnippet(snippet, effectiveLine, selection, sel);
			if (result === null) continue;

			const triggerPos = result.triggerPos;
			const replacement = result.replacement;


			// Expand the snippet
            const start = {line: cursor.line, ch: triggerPos};

            this.expandSnippet(editor, start, cursor, replacement);


			if (replacement.contains("$")) {
				const tabstops = this.snippetManager.getTabstopsFromSnippet(editor, start, replacement);

				this.snippetManager.insertTabstops(editor, tabstops, append);
			}


			const containsTrigger = this.autoEnlargeBracketsTriggers.some(word => replacement.contains("\\" + word));
			if (containsTrigger) this.shouldAutoEnlargeBrackets = true;


            event.preventDefault();
			return true;
		}


		return false;
	}


	private readonly handleTabstops = (editor: Editor, event: KeyboardEvent, cursor: EditorPosition):boolean => {
        const insideTabstop = this.snippetManager.isInsideATabstop(cursor);

		if (insideTabstop) {
			this.snippetManager.consumeAndGotoNextTabstop(editor);

			event.preventDefault();
			return true;
		}

		return false;
    }


	private readonly runAutoFraction = (editor: Editor, event: KeyboardEvent, selections: EditorSelection[]):boolean => {
		let append = false;

		for (const selection of selections) {
			const success = this.runAutoFractionCursor(editor, event, selection, append);

			if (success) {
				append = true;
			}
		}

		if (append) {
			this.autoEnlargeBrackets(editor);
		}

		return append;
	}


	private readonly runAutoFractionCursor = (
		editor: Editor,
		event:KeyboardEvent,
        selection:EditorSelection,
		append: boolean
        ):boolean => {

			const {anchor, head} = selection;


			// Don't run autofraction in excluded environments
			for (const env of this.autofractionExcludedEnvs) {
				if (this.isInsideEnvironment(editor, editor.posToOffset(head), env)) {
					return false;
				}
			}


			const curLine = editor.getRange({...head, ch: 0}, head);
			let start = 0;

			if (!(anchor.line === head.line && anchor.ch === head.ch)) {
				// We have a selection
				// Set start to the beginning of the selection

				start = anchor.ch;
			}
			else {
				// Find the contents of the fraction
                // Match everything except spaces and +-, but allow these characters in brackets


				for (let i = curLine.length - 1; i >= 0; i--) {
					const curChar = curLine.charAt(i)

					if ([")", "]", "}"].contains(curChar)) {
                        const closeBracket = curLine.charAt(i);
						const openBracket = getOpenBracket(closeBracket);

						const matchingBracketIndex = findMatchingBracket(curLine, i, openBracket, closeBracket, true);

						if (matchingBracketIndex === -1) return false;

						// Skip to the beginnning of the bracket
						i = matchingBracketIndex;

						if (i < 0) {
							start = 0;
							break;
						}

                    }

					if ([" ", "+", "-", "=", "$", "(", "[", "{"].contains(curChar)) {
						start = i+1;
						break;
					}
				}
			}

			// Run autofraction

			// Don't run on an empty line
            if (curLine.slice(start) === "") return false;


			const replacement = "\\frac{" + curLine.slice(start, head.ch) + "}{$0}$1";
			this.expandSnippet(editor, {...head, ch: start}, head, replacement);

			const tabstops = this.snippetManager.getTabstopsFromSnippet(editor, {...head, ch: start}, replacement);
			this.snippetManager.insertTabstops(editor, tabstops, append);

			event.preventDefault();
			return true;
	}


	private readonly autoEnlargeBrackets = (editor: Editor) => {
		if (!this.settings.autoEnlargeBrackets) return;

		const cursor = editor.getCursor();
		const pos = editor.posToOffset(cursor);

		const result = this.getEquationBounds(editor, pos);
		if (!result) return false;
		const {start, end} = result;
		const text = editor.getValue();

		for (let i = start; i < end; i++) {
			if (!["[", "("].contains(text.charAt(i))) continue;

			const open = text.charAt(i);
			const close = getCloseBracket(open);
			const j = findMatchingBracket(text, i, open, close, false);


			if ((j === -1) || (j > end)) continue;

			if ((text.substring(i-5, i) === "\\left") && (text.substring(j-6, j) === "\\right")) continue;


			// Check whether the brackets contain sum, int or frac
			const bracketContents = text.substring(i+1, j);
			const containsTrigger = this.autoEnlargeBracketsTriggers.some(word => bracketContents.contains("\\" + word));

			if (!containsTrigger) {
				i = j;
				continue;
			}

			// Enlarge the brackets
			editor.replaceRange(" \\right" + close, editor.offsetToPos(j), editor.offsetToPos(j+1));
			editor.replaceRange("\\left" + open + " ", editor.offsetToPos(i), editor.offsetToPos(i+1));
		}
	}


	private readonly tabout = (editor: Editor, event: KeyboardEvent, withinMath: boolean):boolean => {
		const cursor = editor.getCursor();
		const lineNo = cursor.line;
        const curLine = editor.getLine(lineNo);

        // Move to the next closing bracket: }, ), ], >, |, or outside of $
        for (let i = cursor.ch; i < curLine.length; i++) {
            if (["}", ")", "]", ">", "|", "$"].contains(curLine.charAt(i))) {
                editor.setCursor(lineNo, i+1);

                event.preventDefault();
                return true;
            }
        }


		// If cursor at end of line/equation, move to next line/outside $$ symbols
		if (!withinMath) return false;


		if (curLine.substring(cursor.ch).trim().length === 0) {
			// Trim whitespace at end of line
			editor.setLine(lineNo, curLine.trim());


			if (editor.lastLine() === lineNo) return false;

			const nextLine = editor.getLine(lineNo + 1);
			if (!(nextLine.slice(0, 2) === "$$")) {
				// Move to next line
				editor.setCursor({line: lineNo + 1, ch: 0});

				event.preventDefault();
				return true;
			}

			// Move outside $$ symbols
			// If there is no line after the equation, create one
			if (editor.lastLine() === lineNo + 1) {
				editor.setLine(lineNo + 1, nextLine + "\n");
			}

			editor.setCursor({line: lineNo + 2, ch: 0});

			event.preventDefault();
			return true;
		}


		return false;
	}


	private readonly getEquationBounds = (editor: Editor, pos: number):{start: number, end: number} => {
		const text = editor.getValue();

		const left = text.lastIndexOf("$", pos-1);
		const right = text.indexOf("$", pos);

		if (left === -1 || right === -1) return;


		return {start: left, end: right};
	}


	private readonly isInsideEnvironment = (editor: Editor, pos: number, env: Environment):boolean => {
		const result = this.getEquationBounds(editor, pos);
		if (!result) return false;
		const {start, end} = result;
		const text = editor.getValue();
		const {openSymbol, closeSymbol} = env;


		let left = text.lastIndexOf(openSymbol, pos);
		if (left === -1) return false;

		// Get the inside edge of the openSymbol
		left += openSymbol.length;
		if (pos < left) return false;


		let right;
		if (openSymbol.slice(-1) === "{" && closeSymbol === "}") {
			right = findMatchingBracket(text, left-1, "{", "}", false);
			if (right < pos) return false;
		}
		else {
			right = text.indexOf(closeSymbol, pos);
		}

		if (right === -1) return false;


		// Check that the symbols lie inside the equation
		if (left < start || right > end) return false;


		return true;
	}


	private readonly runMatrixShortcuts = (editor: Editor, event: KeyboardEvent, pos: number):boolean => {
		// Check whether we are inside a matrix / align / case environment
		let isInsideAnEnv = false;

		for (const envName of this.matrixShortcutsEnvNames) {
			const env = {openSymbol: "\\begin{" + envName + "}", closeSymbol: "\\end{" + envName + "}"};

			isInsideAnEnv = this.isInsideEnvironment(editor, pos, env);
			if (isInsideAnEnv) break;
		}

		if (!isInsideAnEnv) return false;


		if (event.key === "Tab") {
			editor.replaceSelection(" & ");

			event.preventDefault();
			return true;
		}
		else if (event.key === "Enter") {
			editor.replaceSelection(" \\\\\n");

			event.preventDefault();
			return true;
		}
		else {
			return false;
		}

	}
}
