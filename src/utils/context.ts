import { EditorState, SelectionRange } from "@codemirror/state";
import { EditorView, PluginValue, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Direction, escalateToToken, findMatchingBracket, getCharacterAtPos, getCloseBracket } from "src/utils/editor_utils";
import { Mode } from "../snippets/options";
import { Environment } from "../snippets/environment";
import { getLatexSuiteConfig } from "../snippets/codemirror/config";
import { syntaxTree } from "@codemirror/language";
import { SyntaxNode, SyntaxNodeRef } from "@lezer/common";

const OPEN_INLINE_MATH_NODE = "formatting_formatting-math_formatting-math-begin_keyword_math";
const CLOSE_INLINE_MATH_NODE = "formatting_formatting-math_formatting-math-end_keyword_math_math-";


const OPEN_DISPLAY_MATH_NODE = "formatting_formatting-math_formatting-math-begin_keyword_math_math-block";
const CLOSE_DISPLAY_MATH_NODE = "formatting_formatting-math_formatting-math-end_keyword_math_math-";
export const open_math_nodes = new Set([OPEN_INLINE_MATH_NODE, OPEN_DISPLAY_MATH_NODE]);
export const close_math_nodes = new Set([CLOSE_INLINE_MATH_NODE, CLOSE_DISPLAY_MATH_NODE]);

export interface Bounds {
	inner_start: number;
	inner_end: number;
	outer_start: number;
	outer_end: number;
}

type MathBounds = Bounds & {mode: MathMode};

export const contextPlugin = ViewPlugin.fromClass(
	class Context implements PluginValue {
	view: EditorView;
	state: EditorState;
	mode!: Mode;
	pos: number;
	ranges: SelectionRange[];
	codeblockLanguage: string;
	boundsCache: Map<number, Bounds>;
	innerBoundsCache: Map<number, Bounds>;
	
	constructor(view: EditorView) {
		this.updateFromView(view);	
	}

	update(update: ViewUpdate) {
		if (!(update.docChanged || update.selectionSet || update.viewportChanged)) return;
		this.updateFromView(update.view);	
	}
	updateFromView(view: EditorView) {
		const state = view.state;
		const sel = state.selection;
		this.view = view;
		this.state = state;
		this.pos = sel.main.to;
		this.ranges = Array.from(sel.ranges).reverse(); // Last to first
		this.mode = new Mode();
		this.boundsCache = new Map();
		this.innerBoundsCache = new Map();

		const codeblockLanguage = langIfWithinCodeblock(state);
		const inCode = codeblockLanguage !== null;

		const settings = getLatexSuiteConfig(state);
		const forceMath = settings.forceMathLanguages.contains(codeblockLanguage);
		this.mode.codeMath = forceMath;
		this.mode.code = inCode && !forceMath;
		if (this.mode.code) this.codeblockLanguage = codeblockLanguage;

		// first, check if math mode should be "generally" on
		const mathBoundsCache = view.plugin(mathBoundsPlugin);
		const inMath = forceMath || mathBoundsCache.inMathBound(state, this.pos);
		
		if (inMath !== true && inMath !== null) {
			const inInlineEquation = inMath.mode === MathMode.InlineMath;
			this.mode.blockMath = !inInlineEquation;
			this.mode.inlineMath = inInlineEquation;
			this.boundsCache.set(this.pos, inMath);
		}

		if (inMath) {
			this.mode.textEnv = this.inTextEnvironment();
		}

		this.mode.text = !inCode && !inMath;

	}

	isWithinEnvironment(pos: number, env: Environment): boolean {
		if (!this.mode.inMath()) return false;

		const bounds = this.getInnerBounds();
		if (!bounds) return;

		const {inner_start: start, inner_end: end} = bounds;
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
			this.isWithinEnvironment(this.pos, {openSymbol: "\\tag{", closeSymbol: "}"}) ||
			this.isWithinEnvironment(this.pos, {openSymbol: "\\begin{", closeSymbol: "}"}) ||
			this.isWithinEnvironment(this.pos, {openSymbol: "\\end{", closeSymbol: "}"}) ||
			this.isWithinEnvironment(this.pos, {openSymbol: "\\mathrm{", closeSymbol: "}"}) ||
			this.isWithinEnvironment(this.pos, {openSymbol: "\\color{", closeSymbol: "}"})
		);
	}

	getBounds(pos: number = this.pos): Bounds {
		// yes, I also want the cache to work over the produced range instead of just that one through
		// a BTree or the like, but that'd be probably overkill
		if (this.boundsCache.has(pos)) {
			return this.boundsCache.get(pos);
		}

		let bounds;
		if (this.mode.codeMath) {
			// means a codeblock language triggered the math mode -> use the codeblock bounds instead
			bounds = getCodeblockBounds(this.state, pos);
		} else {
			bounds = this.view.plugin(mathBoundsPlugin).inMathBound(this.state, pos);
		}

		this.boundsCache.set(pos, bounds);
		return bounds;
	}

	// Accounts for equations within text environments, e.g. $$\text{... $...$}$$
	getInnerBounds(pos: number = this.pos): Bounds {
		let bounds;
		if (this.innerBoundsCache.has(pos)) {
			return this.innerBoundsCache.get(pos);
		}
		if (this.mode.codeMath) {
			// means a codeblock language triggered the math mode -> use the codeblock bounds instead
			bounds = this.getBounds(pos);
		} else {
			bounds = getInnerEquationBounds(this.view);
		}
		this.innerBoundsCache.set(pos, bounds);

		return bounds;
	}

})
type ContextPluginValue<T> = T extends ViewPlugin<infer V> ? V : never
export type Context = ContextPluginValue<typeof contextPlugin>;


enum MathMode {
	InlineMath,
	BlockMath,
}

// Accounts for equations within text environments, e.g. $$\text{... $...$}$$
const getInnerEquationBounds = (view: EditorView, pos?: number ):Bounds => {
	if (!pos) pos = view.state.selection.main.to;
	const bounds = view.plugin(mathBoundsPlugin).inMathBound(view.state, pos);
	if (!bounds) return null;
	let text = view.state.sliceDoc(bounds.inner_start, bounds.inner_end);

	// ignore \$
	text = text.replaceAll("\\$", "\\R");

	const left = text.lastIndexOf("$", pos-1);
	const right = text.indexOf("$", pos);

	if (left === -1 || right === -1) return bounds;

	return {
		inner_start: left + 1,
		inner_end: right,
		outer_start: left,
		outer_end: right + 1,
	};
}

/**
 * Figures out where this codeblock starts and where it ends.
 *
 * **Note:** If you intend to use this directly, check out Context.getBounds instead, which caches and also takes care of codeblock languages which should behave like math mode.
 */
const getCodeblockBounds = (state: EditorState, pos: number = state.selection.main.from):Bounds => {
	const tree = syntaxTree(state);

	let cursor = tree.cursorAt(pos, -1);
	const blockBegin = escalateToToken(cursor, Direction.Backward, "HyperMD-codeblock-begin");

	cursor = tree.cursorAt(pos, -1);
	const blockEnd = escalateToToken(cursor, Direction.Forward, "HyperMD-codeblock-end");

	return {
		inner_start: blockBegin.to + 1,
		inner_end: blockEnd.from - 1,
		outer_start: blockBegin.from,
		outer_end: blockEnd.to,
	};
}

const langIfWithinCodeblock = (state: EditorState): string | null => {
	const tree = syntaxTree(state);

	const pos = state.selection.ranges[0].from;

	/*
	* get a tree cursor at the position
	*
	* A newline does not belong to any syntax nodes except for the Document,
	* which corresponds to the whole document. So, we change the `mode` of the
	* `cursorAt` depending on whether the character just before the cursor is a
	* newline.
	*/
	const cursor =
		pos === 0 || getCharacterAtPos(state, pos - 1) === "\n"
		? tree.cursorAt(pos, 1)
		: tree.cursorAt(pos, -1);

	// check if we're in a codeblock atm at all
	const inCodeblock = cursor.name.contains("codeblock");
	if (!inCodeblock) {
		return null;
	}

	// locate the start of the block
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

export const mathBoundsPlugin = ViewPlugin.fromClass(
	class {
		protected mathBounds: MathBounds[] = [];
		equations: Map<number, string> | null = null;

		constructor(view: EditorView) {
			this.updateMathBounds(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.equations = null;
				this.updateMathBounds(update.view);
			}
		}

		updateMathBounds(view: EditorView) {
			const tree = syntaxTree(view.state);
			const temp_math_nodes: SyntaxNode[] = [];
			for (const { from, to } of view.visibleRanges) {

				tree.iterate({
					from,
					to,
					enter: (node: SyntaxNodeRef) => {
						if (
							open_math_nodes.has(node.name) ||
							close_math_nodes.has(node.name)
						) {
							temp_math_nodes.push(node.node);
						}
					},
				});
			}
			const temp_math_bounds: MathBounds[] = [];
			// nodes could be unbalanced or unbalanced in the viewport
			// - e.g., starting with a closing math node or ending with a opening math node
			if (close_math_nodes.has(temp_math_nodes[0]?.name)) {
				temp_math_bounds.push(
					this.computeEquationBounds(view.state, temp_math_nodes[0].from),
				);
			}
			const start_i = open_math_nodes.has(temp_math_nodes[0]?.name)
				? 0
				: 1;
			for (let i = start_i; i < temp_math_nodes.length - 1; i += 2) {
				const open_node = temp_math_nodes[i];
				const close_node = temp_math_nodes[i + 1];
				temp_math_bounds.push({
					inner_start: open_node.to,
					inner_end: close_node.from,
					outer_start: open_node.from,
					outer_end: close_node.to,
					mode:
						open_node.name === OPEN_INLINE_MATH_NODE
							? MathMode.InlineMath
							: MathMode.BlockMath,
				});
			}
			
			if (
				open_math_nodes.has(
					temp_math_nodes[temp_math_nodes.length - 1]?.name,
				)
			) {
				const last_node = temp_math_nodes[temp_math_nodes.length - 1];
				const bounds = this.computeEquationBounds(view.state, last_node.to);
				if (bounds) {
					temp_math_bounds.push(bounds);
				}
			}
			this.mathBounds = temp_math_bounds;
		}

		inMathBound = (state: EditorState, pos: number): MathBounds | null => {
			const bounds = this.mathBounds;
			if (
				pos <= bounds[0]?.outer_start ||
				pos >= bounds[bounds.length - 1]?.outer_end
			) {
				return this.getEquationBounds(state, pos);
			}
			// Use binary search to efficiently find if pos is within any math bound
			let left = 0,
				right = bounds.length - 1;
			while (left <= right) {
				const mid = (left + right) >> 1;
				const bound = bounds[mid];
				if (pos < bound.outer_start) {
					right = mid - 1;
				} else if (pos >= bound.outer_end) {
					left = mid + 1;
				} else {
					return bound;
				}
			}
			return this.getEquationBounds(state, pos);
		};
		
		getEquationBounds(state: EditorState, pos?: number ):MathBounds | null {
			if (!pos) pos = state.selection.main.to;
			const bounds = this.computeEquationBounds(state, pos);
			if (!bounds) return null;
			this.addMathBound(bounds);
			return bounds;
		}

		/**
		 * Figures out where this equation starts and where it ends.
		 *
		 * **Note:** If you intend to use this directly, check out Context.getBounds or this.inMathBound instead, which caches and also takes care of codeblock languages which should behave like math mode.
		 */
		private computeEquationBounds = (
			state: EditorState,
			pos?: number,
		): MathBounds | null => {
			if (!pos) pos = state.selection.main.to;
			const tree = syntaxTree(state);

			const cursor = tree.cursor();
			cursor.childBefore(pos);
			if (
				!(
					cursor.name.contains("math") &&
					!cursor.name.startsWith("hashtag_hashtag-end_meta_tag")
				)
			) {
				return null;
			}
			if (close_math_nodes.has(cursor.name) && pos >= cursor.to) {
				// Cursor is after a closing math node, so no math mode
				return null;
			}
			do {
				if (open_math_nodes.has(cursor.name)) {
					break;
				}
			} while (cursor.prev());
			const begin = cursor.node;
			if (!begin) return null;
			cursor.childAfter(pos);
			do {
				if (close_math_nodes.has(cursor.name)) {
					break;
				}
			} while (cursor.next());
			const end = cursor.node;
			if (!end) return null;

			// Deals with the case of $|$\n text and stuff $$equations and stuff\n$$
			// where text and stuff is seen as blockmath instead of text
			if (begin.to > pos && begin.name === OPEN_DISPLAY_MATH_NODE) {

				return {
					inner_start: pos - 1,
					inner_end: pos - 1,
					outer_start: pos - 2,
					outer_end: pos,
					mode: MathMode.InlineMath,
				};
			}

			const mathBound: MathBounds = {
				inner_start: begin.to,
				inner_end: end.from,
				outer_start: begin.from,
				outer_end: end.to,
				mode:
					begin.name === OPEN_INLINE_MATH_NODE
						? MathMode.InlineMath
						: MathMode.BlockMath,
			};
			return mathBound;
		};
		
		private addMathBound = (bound: MathBounds) => {
			if (this.mathBounds.length === 0) {
				this.mathBounds.push(bound);
			} else if (bound.outer_end <= this.mathBounds[0].outer_start) {
				this.mathBounds.unshift(bound);
			} else if (bound.outer_start >= this.mathBounds[this.mathBounds.length - 1].outer_end) {
				this.mathBounds.push(bound);
			} else {
				// Binary search for insertion point
				let left = 0, right = this.mathBounds.length - 1;
				while (left <= right) {
					const mid = (left + right) >> 1;
					if (bound.outer_start < this.mathBounds[mid].outer_start) {
						right = mid - 1;
					} else {
						left = mid + 1;
					}
				}
				this.mathBounds.splice(left, 0, bound);
			}
			return bound;
		}
		
		getEquations(state: EditorState) {
			if (this.equations) return this.equations;
			this.equations = new Map(
				this.mathBounds.map((bound) => [
					bound.inner_start,
					state.sliceDoc(bound.inner_start, bound.inner_end),
				]),
			);
			return this.equations;
		}
	},
);
