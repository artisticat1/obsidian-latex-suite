import { editorViewField, Plugin } from "obsidian";
import { EditorView } from "@codemirror/view";
import { SelectionRange, Prec } from "@codemirror/state";
import { isWithinMath, replaceRange, setCursor, isInsideEnvironment, getOpenBracket, getCloseBracket, findMatchingBracket, getEquationBounds } from "./editor_helpers"

import { LatexSuiteSettings, LatexSuiteSettingTab, DEFAULT_SETTINGS } from "./settings"
import { Environment, Snippet, SNIPPET_VARIABLES } from "./snippets"
import { markerStateField } from "./marker_state_field";
import { SnippetManager } from "./snippet_manager";
import { editorCommands } from "./editor_commands"
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
				const pos = update.state.selection.main.head;
                this.handleCursorActivity(pos);
            }

			if (update.transactions.some(tr => tr.isUserEvent("undo"))) {
				this.onUndo();
			}
        }));


		this.addEditorCommands();
	}

	onunload() {
		this.snippetManager.onunload();
	}


	private readonly handleDocChange = () => {
        this.cursorTriggeredByChange = true;
    };

    private readonly handleCursorActivity = (pos: number) => {
        if (this.cursorTriggeredByChange) {
            this.cursorTriggeredByChange = false;
            return;
        }

        if (!this.snippetManager.isInsideATabstop(pos)) {
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


	private readonly onUndo = () => {
		// Remove references to tabstops that were removed in the undo
		this.snippetManager.tidyTabstopReferences();
	}



	private readonly onKeydown = (event: KeyboardEvent, view: EditorView) => {

		const markdownView = view.state.field(editorViewField, false);
		if (!markdownView) return;

		const s = view.state.selection;

		const ranges = Array.from(s.ranges).reverse(); // Last to first
		const pos = s.main.to;
		const withinMath = isWithinMath(view);


		let success = false;


		if (this.settings.snippetsEnabled) {

			// Allows Ctrl + z for undo, instead of triggering a snippet ending with z
			if (!event.ctrlKey) {
				success = this.runSnippets(view, event, withinMath, ranges);

				if (success) return;
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


	private readonly expandSnippet = (view: EditorView, start:number, end: number, replacement:string) => {
		replaceRange(view, start, end, replacement);
	}


	private readonly insertSnippetVariables = (trigger: string) => {

		for (const [variable, replacement] of Object.entries(SNIPPET_VARIABLES)) {
			trigger = trigger.replace(variable, replacement);
		}

		return trigger;
	}



	private readonly runSnippets = (view: EditorView, event: KeyboardEvent, withinMath: boolean, ranges: SelectionRange[]):boolean => {
		let append = false;
		this.shouldAutoEnlargeBrackets = false;

		for (const range of ranges) {
			const success = this.runSnippetCursor(view, event, withinMath, range, append);

			if (success) {
				append = true;
			}
		}

		if (this.shouldAutoEnlargeBrackets) {
			this.autoEnlargeBrackets(view);
		}

		return append;
	}


	private readonly runSnippetCursor = (view: EditorView, event: KeyboardEvent, withinMath: boolean, range: SelectionRange, append:boolean):boolean => {

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

            this.expandSnippet(view, start, to, replacement);


			if (replacement.contains("$")) {
				const tabstops = this.snippetManager.getTabstopsFromSnippet(view, start, replacement);

				this.snippetManager.insertTabstops(view, tabstops, append);
			}


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
		let append = false;

		for (const range of ranges) {
			const success = this.runAutoFractionCursor(view, range, append);

			if (success) {
				append = true;
			}
		}

		if (append) {
			this.autoEnlargeBrackets(view);
			event.preventDefault();
		}

		return append;
	}


	private readonly runAutoFractionCursor = (view: EditorView, range: SelectionRange, append: boolean):boolean => {

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


			const curLine = view.state.sliceDoc(0, to);
			let start = eqnStart;

			if (from != to) {
				// We have a selection
				// Set start to the beginning of the selection

				start = from;
			}
			else {
				// Find the contents of the fraction
                // Match everything except spaces and +-, but allow these characters in brackets


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
			let numerator = curLine.slice(start);

			// Don't run on an empty line
            if (numerator === "") return false;


			// Remove brackets
			if (curLine.charAt(start) === "(" && curLine.charAt(to - 1) === ")") {
				numerator = numerator.slice(1, -1);
			}


			const replacement = "\\frac{" + numerator + "}{$0}$1";
			this.expandSnippet(view, start, to, replacement);

			const tabstops = this.snippetManager.getTabstopsFromSnippet(view, start, replacement);
			this.snippetManager.insertTabstops(view, tabstops, append);

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
		const pos = view.state.selection.main.to;
		const result = getEquationBounds(view);
		if (!result) return false;
		const end = result.end;

		const d = view.state.doc;
		const text = d.toString();
		const line = d.lineAt(pos);



        // Move to the next closing bracket: }, ), ], >, |
        for (let i = pos; i < end; i++) {
            if (["}", ")", "]", ">", "|"].contains(text.charAt(i))) {
                setCursor(view, i+1);

                event.preventDefault();
                return true;
            }
        }


		// If inside inline math, move outside the closing $
		if (text.slice(end, end+2) != "$$") {
			setCursor(view, end+1);

			event.preventDefault();
			return true;
		}


		// If cursor at end of line/equation, move to next line/outside $$ symbols
		if (!withinMath) return false;

		const linePos = pos - line.from;


		// Check whether we're at end of line
		if (!(line.text.slice(linePos).trim().length === 0)) {
			return false;
		}


		// Trim whitespace at end of line
		replaceRange(view, line.from, line.to, line.text.trim());


		// If this is the last line, exit
		if (line.number === d.lines) return false;


		// Move outside $$ symbols
		if (!(text.slice(line.to + 1, line.to + 3) === "$$")) {
			return false;
		}

		const nextLine = view.state.doc.line(line.number + 1);

		// If there's no line after the equation, create one
		if (line.number + 1 === d.lines) {
			replaceRange(view, nextLine.to, nextLine.to, "\n");
		}

		setCursor(view, nextLine.to + 1);
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
