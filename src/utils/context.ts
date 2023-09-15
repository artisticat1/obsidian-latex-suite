import { EditorState, SelectionRange } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Direction, escalateToToken, findMatchingBracket, getCloseBracket } from "src/utils/editor_utils";
import { Mode } from "../snippets/options";
import { Environment } from "../snippets/snippets";
import { getLatexSuiteConfig } from "../snippets/codemirror/config";
import { syntaxTree } from "@codemirror/language";

export interface Bounds {
	start: number;
	end: number;
}

export class Context {
	state: EditorState;
	mode!: Mode;
	codeblockLanguage: string;
	pos: number;
	ranges: SelectionRange[];
	boundsCache: Map<number, Bounds>;

	actuallyCodeblock: boolean;

	static fromState(state: EditorState):Context {
		const ctx = new Context();
		const sel = state.selection;
		ctx.state = state;
		ctx.pos = sel.main.to;
		ctx.ranges = Array.from(sel.ranges).reverse(); // Last to first
		ctx.mode = new Mode();
		ctx.boundsCache = new Map();

		const settings = getLatexSuiteConfig(state);
		const codeblockLanguage = Context.langIfWithinCodeblock(state);
		const inCode = codeblockLanguage !== null;
		const ignoreMath = settings.parsedSettings.ignoreMathLanguages.contains(codeblockLanguage);
		const forceMath = settings.parsedSettings.forceMathLanguages.contains(codeblockLanguage);
		ctx.actuallyCodeblock = forceMath;

		// first, check if math mode should be "generally" on
		let inMath = forceMath || (
			!ignoreMath
			&& Context.isWithinEquation(state)
		);

		if (inMath) {
			const inInlineEquation = Context.isWithinInlineEquation(state);

			ctx.mode.blockMath = !inInlineEquation;
			ctx.mode.inlineMath = inInlineEquation;

			// then check if the environment "temporarily" disables math mode
			inMath = !(ctx.inTextEnvironment());
		}

		if (!inMath) {
			ctx.mode.blockMath = false;
			ctx.mode.inlineMath = false;
		}

		ctx.mode.code = inCode && !forceMath;
		if (ctx.mode.code) ctx.codeblockLanguage = codeblockLanguage;

		ctx.mode.text = !inCode && !inMath;

		return ctx;
	}

	static fromView(view: EditorView):Context {
		return Context.fromState(view.state);
	}

	isWithinEnvironment(pos: number, env: Environment): boolean {
		if (!this.mode.anyMath()) return false;

		const bounds = this.getBounds();
		if (!bounds) return;

		const {start, end} = bounds;
		const text = this.state.sliceDoc(start, end);
		// pos referred to the absolute position in the whole document, but we just sliced the text
		// so now pos must be relative to the start in order to be any useful
		pos -= start;

		const openBracket = env.openSymbol.slice(-1);
		const closeBracket = getCloseBracket(openBracket);

		// Take care when the open symbol ends with a bracket {, [, or (
		// as then the closing symbol, }, ] or ), is not unique to this open symbol
		let offset;
		let openSearchSymbol;

		if (["{", "[", "("].contains(openBracket) && env.closeSymbol === closeBracket) {
			offset = env.openSymbol.length - 1;
			openSearchSymbol = openBracket;
		} else {
			offset = 0;
			openSearchSymbol = env.openSymbol;
		}

		let left = text.lastIndexOf(env.openSymbol, pos - 1);

		while (left != -1) {
			const right = findMatchingBracket(text, left + offset, openSearchSymbol, env.closeSymbol, false);

			if (right === -1) return false;

			// Check whether the cursor lies inside the environment symbols
			if ((right >= pos) && (pos >= left + env.openSymbol.length)) {
				return true;
			}

			if (left <= 0) return false;

			// Find the next open symbol
			left = text.lastIndexOf(env.openSymbol, left - 1);
		}

		return false;
	}

	inTextEnvironment(): boolean {
		return (
			this.isWithinEnvironment(this.pos, {openSymbol: "\\text{", closeSymbol: "}"}) ||
			this.isWithinEnvironment(this.pos, {openSymbol: "\\tag{", closeSymbol: "}"})
		);
	}

	getBounds(pos: number = this.pos): Bounds {
		// yes, I also want the cache to work over the produced range instead of just that one through
		// a BTree or the like, but that'd be probably overkill
		if (this.boundsCache.has(pos)) {
			return this.boundsCache.get(pos);
		}

		let bounds;
		if (this.actuallyCodeblock) {
			// means a codeblock language triggered the math mode -> use the codeblock bounds instead
			bounds = Context.getCodeblockBounds(this.state, pos);
		} else {
			bounds = Context.getInnerEquationBounds(this.state);
		}

		this.boundsCache.set(pos, bounds);
		return bounds;
	}

	static isWithinEquation(state: EditorState):boolean {
		const pos = state.selection.main.to;
		const tree = syntaxTree(state);

		let syntaxNode = tree.resolveInner(pos, -1);
		if (syntaxNode.name.contains("math-end")) return false;

		if (!syntaxNode.parent) {
			syntaxNode = tree.resolveInner(pos, 1);
			if (syntaxNode.name.contains("math-begin")) return false;
		}

		// Account/allow for being on an empty line in a equation
		if (!syntaxNode.parent) {
			const left = tree.resolveInner(pos - 1, -1);
			const right = tree.resolveInner(pos + 1, 1);

			return (left.name.contains("math") && right.name.contains("math"));
		}

		return (syntaxNode.name.contains("math"));
	}

	static isWithinInlineEquation(state: EditorState):boolean {
		const pos = state.selection.main.to;
		const tree = syntaxTree(state);

		let syntaxNode = tree.resolveInner(pos, -1);
		if (syntaxNode.name.contains("math-end")) return false;

		if (!syntaxNode.parent) {
			syntaxNode = tree.resolveInner(pos, 1);
			if (syntaxNode.name.contains("math-begin")) return false;
		}

		// Account/allow for being on an empty line in a equation
		if (!syntaxNode.parent) syntaxNode = tree.resolveInner(pos - 1, -1);

		const cursor = syntaxNode.cursor();
		const res = escalateToToken(cursor, Direction.Backward, "math-begin");

		return !res.name.contains("math-block");
	}

	/**
	 * Figures out where this equation starts and where it ends.
	 *
	 * **Note:** If you intend to use this directly, check out Context.getBounds instead, which caches and also takes care of codeblock languages which should behave like math mode.
	 */
	static getEquationBounds(state: EditorState, pos?: number): Bounds {
		if (!pos) pos = state.selection.main.to;
		const tree = syntaxTree(state);

		let syntaxNode = tree.resolveInner(pos, -1);

		if (!syntaxNode.parent) {
			syntaxNode = tree.resolveInner(pos, 1);
		}

		// Account/allow for being on an empty line in a equation
		if (!syntaxNode.parent) syntaxNode = tree.resolveInner(pos - 1, -1);

		const cursor = syntaxNode.cursor();
		const begin = escalateToToken(cursor, Direction.Backward, "math-begin");
		const end = escalateToToken(cursor, Direction.Forward, "math-end");

		if (begin && end) {
			return {start: begin.to, end: end.from};
		}
		else {
			return null;
		}
	}

	// Accounts for equations within text environments, e.g. $$\text{... $...$}$$
	static getInnerEquationBounds(state: EditorState, pos?: number): Bounds {
		if (!pos) pos = state.selection.main.to;
		let text = state.doc.toString();

		// ignore \$
		text = text.replaceAll("\\$", "\\R");

		const left = text.lastIndexOf("$", pos-1);
		const right = text.indexOf("$", pos);

		if (left === -1 || right === -1) return null;

		return {start: left + 1, end: right};
	}

	/**
	 * Figures out where this codeblock starts and where it ends.
	 *
	 * **Note:** If you intend to use this directly, check out Context.getBounds instead, which caches and also takes care of codeblock languages which should behave like math mode.
	 */
	static getCodeblockBounds(state: EditorState, pos: number = state.selection.main.from): Bounds {
		const tree = syntaxTree(state);

		let cursor = tree.cursorAt(pos, -1);
		const blockBegin = escalateToToken(cursor, Direction.Backward, "HyperMD-codeblock-begin");

		cursor = tree.cursorAt(pos, -1);
		const blockEnd = escalateToToken(cursor, Direction.Forward, "HyperMD-codeblock-end");

		return { start: blockBegin.to + 1, end: blockEnd.from - 1 };
	}

	static langIfWithinCodeblock(view: EditorView | EditorState): string | null {
		const state = view instanceof EditorView ? view.state : view;
		const tree = syntaxTree(state);

		const pos = state.selection.ranges[0].from;

		// check if we're in a codeblock atm at all
		// somehow only the -1 side is reliable, all other ones are sporadically active
		const inCodeblock = tree.resolveInner(pos, -1).name.contains("codeblock");
		if (!inCodeblock) {
			return null;
		}

		// locate the start of the block
		const cursor = tree.cursorAt(pos, -1);
		const codeblockBegin = escalateToToken(cursor, Direction.Backward, "HyperMD-codeblock_HyperMD-codeblock-begin");

		if (codeblockBegin == null) {
			console.warn("unable to locate start of the codeblock even though inside one");
			return "";
		}

		// extract the language
		// codeblocks may start and end with an arbitrary number of backticks
		const language = state.sliceDoc(codeblockBegin.from, codeblockBegin.to).replace(/`+/, "");

		return language;
	}

}
