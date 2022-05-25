import { Plugin, Notice, MarkdownView } from "obsidian";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { SelectionRange, Prec, Extension } from "@codemirror/state";
import { invertedEffects, undo, redo } from "@codemirror/history";


import { LatexSuiteSettings, LatexSuiteSettingTab, DEFAULT_SETTINGS } from "./settings"
import { isWithinMath, replaceRange, setCursor, isInsideEnvironment, getOpenBracket, getCloseBracket, findMatchingBracket, getEquationBounds } from "./editor_helpers"
import { markerStateField, addMark, removeMark, startSnippet, endSnippet, undidStartSnippet, undidEndSnippet } from "./marker_state_field";
import { Environment, Snippet, SNIPPET_VARIABLES } from "./snippets"
import { SnippetManager } from "./snippet_manager";
import { concealPlugin } from "./conceal";
import { editorCommands } from "./editor_commands";
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


	private inVimInsertMode = false;

	private concealPluginExt:Extension[] = [];


	async onload() {
		await this.loadSettings();

		if ((this.app.vault as any).config?.legacyEditor) {
			const message = "Obsidian Latex Suite: This plugin does not support the legacy editor.";

			new Notice(message, 10000);
            console.log(message);

			return;
        }

		this.addSettingTab(new LatexSuiteSettingTab(this.app, this));
		this.snippetManager = new SnippetManager();


		// Handle vim mode
		this.app.workspace.on("file-open", this.trackVimMode.bind(this));


		this.registerEditorExtension(markerStateField);
		this.registerEditorExtension(this.getInvertedEffects());

		this.registerEditorExtension(Prec.highest(EditorView.domEventHandlers({
            "keydown": this.onKeydown
        })));

		this.registerEditorExtension(EditorView.updateListener.of(update => {
            if (update.docChanged) {
                this.handleDocChange();
            }

            if (update.selectionSet) {
				const pos = update.state.selection.main.head;
                this.handleCursorActivity(update.view, pos);
            }

			this.handleUndoRedo(update);
        }));

		this.registerEditorExtension(this.concealPluginExt);



		this.addEditorCommands();
	}

	onunload() {
		this.snippetManager.onunload();

		// Doesn't work for some reason
		// this.app.workspace.off("file-open", this.vimModeTracker);
	}


	private readonly handleDocChange = () => {
        this.cursorTriggeredByChange = true;
    }


    private readonly handleCursorActivity = (view: EditorView, pos: number) => {
        if (this.cursorTriggeredByChange) {
            this.cursorTriggeredByChange = false;
            return;
        }

        if (!this.snippetManager.isInsideATabstop(pos) || this.snippetManager.isInsideLastTabstop(pos)) {
            this.snippetManager.clearAllTabstops(view);
        }
    }


	private readonly handleUndoRedo = (update: ViewUpdate) => {
		const undoTr = update.transactions.find(tr => tr.isUserEvent("undo"));
		const redoTr = update.transactions.find(tr => tr.isUserEvent("redo"));


		for (const tr of update.transactions) {
			for (const effect of tr.effects) {

				if (effect.is(startSnippet)) {
					if (redoTr) {
						// Redo the addition of marks, tabstop expansion, and selection
						redo(update.view);
						redo(update.view);
						redo(update.view);
					}
				}
				else if (effect.is(undidEndSnippet)) {
					if (undoTr) {
						// Undo the addition of marks, tabstop expansion, and selection
						undo(update.view);
						undo(update.view);
						undo(update.view);
					}
				}
			}
		}

		if (undoTr) {
			this.snippetManager.tidyTabstopReferences();
		}
	}


	private readonly getInvertedEffects = () => {
		// Enables undoing and redoing snippets, taking care of the tabstops

		return invertedEffects.of(tr => {
			const effects = [];

			for (const effect of tr.effects) {
				if (effect.is(addMark)) {
					effects.push(removeMark.of(effect.value));
				}
				else if (effect.is(removeMark)) {
					effects.push(addMark.of(effect.value));
				}

				else if (effect.is(startSnippet)) {
					effects.push(undidStartSnippet.of(null));
				}
				else if (effect.is(undidStartSnippet)) {
					effects.push(startSnippet.of(null));
				}
				else if (effect.is(endSnippet)) {
					effects.push(undidEndSnippet.of(null));
				}
				else if (effect.is(undidEndSnippet)) {
					effects.push(endSnippet.of(null));
				}
			}


			return effects;
		})
	}


	enableConceal() {
		this.concealPluginExt.push(concealPlugin.extension);
		this.app.workspace.updateOptions();
	}


	disableConceal() {
		this.concealPluginExt.pop();
		this.app.workspace.updateOptions();
	}



	trackVimMode() {
		// From https://github.com/esm7/obsidian-vimrc-support/blob/master/main.ts

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = (view as any).sourceMode?.cmEditor?.cm?.cm;
		if (!editor) return;

		editor.on("vim-mode-change", (modeObj: any) => {
			if (!modeObj) return;

			this.inVimInsertMode = (modeObj.mode === "insert");
			// console.log(this.inVimInsertMode);
		});
	}



	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.setSnippets(this.settings.snippets);
		this.setAutofractionExcludedEnvs(this.settings.autofractionExcludedEnvs);
		this.matrixShortcutsEnvNames = this.settings.matrixShortcutsEnvNames.replace(/\s/g,"").split(",");
		this.autoEnlargeBracketsTriggers = this.settings.autoEnlargeBracketsTriggers.replace(/\s/g,"").split(",");

		if (this.settings.concealEnabled) this.enableConceal();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	setSnippets(snippetsStr:string) {
		const snippets = parse(snippetsStr);

		if (!this.validateSnippets(snippets)) throw "Invalid snippet format.";

		this.sortSnippets(snippets);

		this.snippets = snippets;
	}


	validateSnippets(snippets: Snippet[]):boolean {
		let valid = true;

		for (const snippet of snippets) {
			// Check that the snippet trigger, replacement and options are defined

			if (!(snippet.trigger && snippet.replacement && snippet.options != undefined)) {
				valid = false;
				break;
			}
		}

		return valid;
	}


	sortSnippets(snippets:Snippet[]) {
		// Sort snippets in order of priority

		function compare( a:Snippet, b:Snippet ) {
			const aPriority = a.priority === undefined ? 0 : a.priority;
			const bPriority = b.priority === undefined ? 0 : b.priority;

			if ( aPriority < bPriority ){
				return 1;
			}
			if ( aPriority > bPriority ){
				return -1;
			}
			return 0;
		}

		snippets.sort(compare);
	}



	setAutofractionExcludedEnvs(envsStr: string) {
		const envsJSON = JSON.parse(envsStr);
		const envs = envsJSON.map(function(env: string[]) {
			return {openSymbol: env[0], closeSymbol: env[1]};
		});

		this.autofractionExcludedEnvs = envs;
	}



	private readonly addEditorCommands = () => {
		for (const command of editorCommands) {
			this.addCommand(command);
		}
	}



	private readonly onKeydown = (event: KeyboardEvent, view: EditorView) => {

		const s = view.state.selection;
		const pos = s.main.to;
		const ranges = Array.from(s.ranges).reverse(); // Last to first

		const withinMath = isWithinMath(view);

		// @ts-ignore
		const inVimMode = this.app.vault.getConfig("vimMode");


		let success = false;


		if (this.settings.snippetsEnabled) {
			// Only run snippets while in insert mode in vim
			if ((!inVimMode || this.inVimInsertMode)) {

				// Allows Ctrl + z for undo, instead of triggering a snippet ending with z
				if (!event.ctrlKey) {
					success = this.runSnippets(view, event, withinMath, ranges);

					if (success) return;
				}
			}
		}


		if (event.key === "Tab") {
			success = this.handleTabstops(view, event);

			if (success) return;
		}


		if (this.settings.autofractionEnabled && withinMath) {
			if (event.key === "/") {
				success = this.runAutoFraction(view, event, ranges);

				if (success) return;
			}
		}


		if (this.settings.matrixShortcutsEnabled && withinMath) {
			if (["Tab", "Enter"].contains(event.key)) {
				success = this.runMatrixShortcuts(view, event, pos);

				if (success) return;
			}
		}


		if (this.settings.taboutEnabled) {
			if (event.key === "Tab") {
				success = this.tabout(view, event, withinMath);

				if (success) return;
			}
		}
	}



	private readonly checkSnippet = (snippet: Snippet, effectiveLine: string, range:  SelectionRange, sel: string):{triggerPos: number; replacement: string} => {
		let triggerPos;
		let trigger = snippet.trigger;
		trigger = this.insertSnippetVariables(trigger);

		let replacement = snippet.replacement;


		if (snippet.replacement.contains("${VISUAL}")) {
			// "Visual" snippets
			if (!sel) return null;

			// Check whether the trigger text was typed
			if (!(effectiveLine.slice(-trigger.length) === trigger)) return null;


			triggerPos = range.from;
			replacement = snippet.replacement.replace("${VISUAL}", sel);

		}
		else if (sel) {
			// Don't run non-visual snippets when there is a selection
			return null;
		}
		else if (!(snippet.options.contains("r"))) {

			// Check whether the trigger text was typed
			if (!(effectiveLine.slice(-trigger.length) === trigger)) return null;

			triggerPos = effectiveLine.length - trigger.length;

		}
		else {
			// Regex snippet

			// Add $ to match the end of the string
			// i.e. look for a match at the cursor's current position
			const regex = new RegExp(trigger + "$");
			const result = regex.exec(effectiveLine);

			if (!(result)) {
				return null;
			}

			// Compute the replacement string
			// result.length - 1 = the number of capturing groups

			for (let i = 1; i < result.length; i++) {
				// i-1 to start from 0
				replacement = replacement.replaceAll("[[" + (i-1) + "]]", result[i]);
			}

			triggerPos = result.index;
		}

		return {triggerPos: triggerPos, replacement: replacement};
	}



	private readonly insertSnippetVariables = (trigger: string) => {

		for (const [variable, replacement] of Object.entries(SNIPPET_VARIABLES)) {
			trigger = trigger.replace(variable, replacement);
		}

		return trigger;
	}



	private readonly runSnippets = (view: EditorView, event: KeyboardEvent, withinMath: boolean, ranges: SelectionRange[]):boolean => {

		this.shouldAutoEnlargeBrackets = false;

		for (const range of ranges) {
			this.runSnippetCursor(view, event, withinMath, range);
		}

		const success = this.snippetManager.expandSnippets(view);


		if (this.shouldAutoEnlargeBrackets) {
			this.autoEnlargeBrackets(view);
		}

		return success;
	}


	private readonly runSnippetCursor = (view: EditorView, event: KeyboardEvent, withinMath: boolean, range: SelectionRange):boolean => {

		const {from, to} = range;
		const sel = view.state.sliceDoc(from, to);


		for (const snippet of this.snippets) {

			let effectiveLine = view.state.sliceDoc(0, to);

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


			const result = this.checkSnippet(snippet, effectiveLine, range, sel);
			if (result === null) continue;
			const { triggerPos, replacement } = result;


			// Expand the snippet
            const start = triggerPos;
			this.snippetManager.queueSnippet({from: start, to: to, insert: replacement});


			const containsTrigger = this.autoEnlargeBracketsTriggers.some(word => replacement.contains("\\" + word));
			if (containsTrigger) this.shouldAutoEnlargeBrackets = true;


            event.preventDefault();
			return true;
		}


		return false;
	}


	private readonly handleTabstops = (view: EditorView, event: KeyboardEvent):boolean => {
        const success = this.snippetManager.consumeAndGotoNextTabstop(view);

		if (success) event.preventDefault();

		return success;
    }


	private readonly runAutoFraction = (view: EditorView, event: KeyboardEvent, ranges: SelectionRange[]):boolean => {

		for (const range of ranges) {
			this.runAutoFractionCursor(view, range);
		}

		const success = this.snippetManager.expandSnippets(view);

		if (success) {
			this.autoEnlargeBrackets(view);
			event.preventDefault();
		}

		return success;
	}


	private readonly runAutoFractionCursor = (view: EditorView, range: SelectionRange):boolean => {

			const {from, to} = range;


			// Don't run autofraction in excluded environments
			for (const env of this.autofractionExcludedEnvs) {
				if (isInsideEnvironment(view, to, env)) {
					return false;
				}
			}

			// Get the bounds of the equation
			const result = getEquationBounds(view);
			if (!result) return false;
			const eqnStart = result.start;


			let curLine = view.state.sliceDoc(0, to);
			let start = eqnStart;

			if (from != to) {
				// We have a selection
				// Set start to the beginning of the selection

				start = from;
			}
			else {
				// Find the contents of the fraction
                // Match everything except spaces and +-, but allow these characters in brackets

				// Also, allow spaces after greek letters
				// By replacing spaces after greek letters with a dummy character (#)

				if (this.settings.autofractionSpaceAfterGreekLetters) {
					const regex = new RegExp("(" + SNIPPET_VARIABLES["${GREEK}"] + ") ([^ ])", "g");
					curLine = curLine.replace(regex, "$1#$2");
				}


				for (let i = curLine.length - 1; i >= eqnStart; i--) {
					const curChar = curLine.charAt(i)

					if ([")", "]", "}"].contains(curChar)) {
                        const closeBracket = curChar;
						const openBracket = getOpenBracket(closeBracket);

						const j = findMatchingBracket(curLine, i, openBracket, closeBracket, true);

						if (j === -1) return false;

						// Skip to the beginnning of the bracket
						i = j;

						if (i < eqnStart) {
							start = eqnStart;
							break;
						}

                    }

					if ([" ", "+", "-", "=", "$", "(", "[", "{", "\n"].contains(curChar)) {
						start = i+1;
						break;
					}
				}
			}

			// Run autofraction
			let numerator = view.state.sliceDoc(start, to);

			// Don't run on an empty line
            if (numerator === "") return false;


			// Remove brackets
			if (curLine.charAt(start) === "(" && curLine.charAt(to - 1) === ")") {
				numerator = numerator.slice(1, -1);
			}


			const replacement = "\\frac{" + numerator + "}{$0}$1";

			this.snippetManager.queueSnippet({from: start, to: to, insert: replacement});

			return true;
	}


	private readonly autoEnlargeBrackets = (view: EditorView) => {
		if (!this.settings.autoEnlargeBrackets) return;

		const result = getEquationBounds(view);
		if (!result) return false;
		const {start, end} = result;

		const text = view.state.doc.toString();
		const left = "\\left";
		const right = "\\right";


		for (let i = start; i < end; i++) {
			if (!["[", "("].contains(text.charAt(i))) continue;

			const open = text.charAt(i);
			const close = getCloseBracket(open);

			const j = findMatchingBracket(text, i, open, close, false, end);
			if (j === -1) continue;

			if ((text.slice(i-left.length, i) === left) && (text.slice(j-right.length, j) === right)) continue;


			// Check whether the brackets contain sum, int or frac
			const bracketContents = text.slice(i+1, j);
			const containsTrigger = this.autoEnlargeBracketsTriggers.some(word => bracketContents.contains("\\" + word));

			if (!containsTrigger) {
				i = j;
				continue;
			}

			// Enlarge the brackets
			replaceRange(view, j, j+1, " " + right + close);
			replaceRange(view, i, i+1, left + open + " ");
		}
	}


	private readonly tabout = (view: EditorView, event: KeyboardEvent, withinMath: boolean):boolean => {
		if (!withinMath) return false;

		const pos = view.state.selection.main.to;
		const result = getEquationBounds(view);
		if (!result) return false;
		const end = result.end;

		const d = view.state.doc;
		const text = d.toString();



        // Move to the next closing bracket: }, ), ], >, |
        for (let i = pos; i < end; i++) {
            if (["}", ")", "]", ">", "|"].contains(text.charAt(i))) {
                setCursor(view, i+1);

                event.preventDefault();
                return true;
            }
        }


		// If cursor at end of line/equation, move to next line/outside $$ symbols

		// Check whether we're at end of equation
		// Accounting for whitespace, using trim
		const textBtwnCursorAndEnd = d.sliceString(pos, end);
		const atEnd = textBtwnCursorAndEnd.trim().length === 0;

		if (!atEnd) return false;


		// Check whether we're in inline math or a block eqn
		const inlineMath = d.sliceString(end, end+2) != "$$";

		if (inlineMath) {
			setCursor(view, end + 1);
		}
		else {
			// First, locate the $$ symbol
			const dollarLine = d.lineAt(end+2);

			// If there's no line after the equation, create one

			if (dollarLine.number === d.lines) {
				replaceRange(view, dollarLine.to, dollarLine.to, "\n");
			}

			// Finally, move outside the $$ symbol
			setCursor(view, dollarLine.to + 1);


			// Trim whitespace at beginning / end of equation
			const line = d.lineAt(pos);
			replaceRange(view, line.from, line.to, line.text.trim());

		}

		event.preventDefault();
		return true;
	}



	private readonly runMatrixShortcuts = (view: EditorView, event: KeyboardEvent, pos: number):boolean => {
		// Check whether we are inside a matrix / align / case environment
		let isInsideAnEnv = false;

		for (const envName of this.matrixShortcutsEnvNames) {
			const env = {openSymbol: "\\begin{" + envName + "}", closeSymbol: "\\end{" + envName + "}"};

			isInsideAnEnv = isInsideEnvironment(view, pos, env);
			if (isInsideAnEnv) break;
		}

		if (!isInsideAnEnv) return false;


		if (event.key === "Tab") {
			view.dispatch(view.state.replaceSelection(" & "));

			event.preventDefault();
			return true;
		}
		else if (event.key === "Enter") {
			if (event.shiftKey) {
				// Move cursor to end of next line
				const d = view.state.doc;

				const nextLineNo = d.lineAt(pos).number + 1;
				const nextLine = d.line(nextLineNo);

				setCursor(view, nextLine.to);
			}
			else {
				view.dispatch(view.state.replaceSelection(" \\\\\n"));
			}

			event.preventDefault();
			return true;
		}
		else {
			return false;
		}

	}
}
