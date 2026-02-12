import { EditorState, SelectionRange } from "@codemirror/state";
import { EditorView, PluginValue, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Direction, escalateToToken, findMatchingBracket, getCharacterAtPos, getCloseBracket } from "src/utils/editor_utils";
import { Mode } from "../snippets/options";
import { Environment } from "../snippets/environment";
import { getLatexSuiteConfig } from "../snippets/codemirror/config";
import { syntaxTree } from "@codemirror/language";
import { SyntaxNode, SyntaxNodeRef } from "@lezer/common";
import { textAreaEnvs } from "./default_text_areas";

const OPEN_INLINE_MATH_NODE = "formatting_formatting-math_formatting-math-begin_keyword_math";
const CLOSE_INLINE_MATH_NODE = "formatting_formatting-math_formatting-math-end_keyword_math_math-";


const OPEN_DISPLAY_MATH_NODE = "formatting_formatting-math_formatting-math-begin_keyword_math_math-block";
const CLOSE_DISPLAY_MATH_NODE = "formatting_formatting-math_formatting-math-end_keyword_math_math-";
export const open_math_nodes = new Set([OPEN_INLINE_MATH_NODE, OPEN_DISPLAY_MATH_NODE]);
export const close_math_nodes = new Set([CLOSE_INLINE_MATH_NODE, CLOSE_DISPLAY_MATH_NODE]);
const OPEN_CODEBLOCK_NODE =
	"HyperMD-codeblock_HyperMD-codeblock-begin_HyperMD-codeblock-begin-bg_HyperMD-codeblock-bg";
const CLOSE_CODEBLOCK_NODE =
	"HyperMD-codeblock_HyperMD-codeblock-bg_HyperMD-codeblock-end_HyperMD-codeblock-end-bg";

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
	codeblockLanguage: string | null = null;
	boundsCache: Map<number, Bounds | null>;
	innerBoundsCache: Map<number, Bounds | null>;
	
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
		this.codeblockLanguage = null;

		const codeBlockInfo = langIfWithinCodeblock(state);
		const codeblockLanguage = codeBlockInfo?.codeblockLanguage ?? null;
		const inCode = codeblockLanguage !== null;

		const settings = getLatexSuiteConfig(state);
		const forceMath =
			inCode &&
			settings.forceMathLanguages.contains(codeblockLanguage);
		this.mode.codeMath = forceMath;
		this.mode.code = inCode && !forceMath;
		if (inCode && this.mode.code) {
			this.codeblockLanguage = codeblockLanguage;
			this.boundsCache.set(this.pos, codeBlockInfo);
		}

		// first, check if math mode should be "generally" on
		const mathBoundsCache = getMathBoundsPlugin(view);
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

	isWithinEnvironment(pos: number, envs: Environment | Environment[]): boolean {
		if (!this.mode.inMath()) return false;

		const bounds = this.getInnerBounds();
		if (!bounds) return false;

		const {inner_start: start, inner_end: end} = bounds;
		const text = this.state.sliceDoc(start, end);
		if (!Array.isArray(envs)) {
			envs = [envs];
		}
		outer_loop: for (const env of envs) {
			// pos referred to the absolute position in the whole document, but we just sliced the text
			// so now pos must be relative to the start in order to be any useful
			pos -= start;

			const openBracket = env.openSymbol.slice(-1);
			const closeBracket = getCloseBracket(openBracket);

			// Take care when the open symbol ends with a bracket {, [, or (
			// as then the closing symbol, }, ] or ), is not unique to this open symbol
			let offset;
			let openSearchSymbol;

			if (
				["{", "[", "("].contains(openBracket) &&
				env.closeSymbol === closeBracket
			) {
				offset = env.openSymbol.length - 1;
				openSearchSymbol = openBracket;
			} else {
				offset = 0;
				openSearchSymbol = env.openSymbol;
			}

			let left = text.lastIndexOf(env.openSymbol, pos - 1);

			while (left != -1) {
				const right = findMatchingBracket(
					text,
					left + offset,
					openSearchSymbol,
					env.closeSymbol,
					false,
				);

				if (right === -1) continue outer_loop;

				// Check whether the cursor lies inside the environment symbols
				if (right >= pos && pos >= left + env.openSymbol.length) {
					return true;
				}

				if (left <= 0) continue outer_loop;

				// Find the next open symbol
				left = text.lastIndexOf(env.openSymbol, left - 1);
			}
		}

		return false;
	}

	inTextEnvironment(): boolean {
		return this.isWithinEnvironment(this.pos, textAreaEnvs)
	}

	getBounds(pos: number = this.pos): Bounds | null {
		// yes, I also want the cache to work over the produced range instead of just that one through
		// a BTree or the like, but that'd be probably overkill
		const cached = this.boundsCache.get(pos);
		if (cached !== undefined) {
			return cached;
		}

		let bounds: Bounds | null;
		if (this.mode.codeMath) {
			// means a codeblock language triggered the math mode -> use the codeblock bounds instead
			bounds = getCodeblockBounds(this.state, pos);
		} else {
			bounds = getMathBoundsPlugin(this.view).inMathBound(this.state, pos);
		}

		this.boundsCache.set(pos, bounds);
		return bounds;
	}

	// Accounts for equations within text environments, e.g. $$\text{... $...$}$$
	getInnerBounds(pos: number = this.pos): Bounds | null {
		let bounds: Bounds | null;
		const cached = this.innerBoundsCache.get(pos);
		if (cached !== undefined) {
			return cached;
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
export const getContextPlugin = (view: EditorView): Context => {
	const plugin = view.plugin(contextPlugin)
	if (!plugin) {
		throw new Error("Context plugin not found, something went wrong with the plugin initialization");
	}
	return plugin;
}


enum MathMode {
	InlineMath,
	BlockMath,
}

// Accounts for equations within text environments, e.g. $$\text{... $...$}$$
const getInnerEquationBounds = (view: EditorView, pos?: number ):Bounds | null => {
	if (!pos) pos = view.state.selection.main.to;
	const bounds = getMathBoundsPlugin(view).inMathBound(view.state, pos);
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
const getCodeblockBounds = (
	state: EditorState,
	pos: number = state.selection.main.from,
): Bounds | null => {
	const bounds = getCodeblockBoundNodes(state, pos);
	if (!bounds) return null;
	const { begin: blockBegin, end: blockEnd } = bounds; 
	return {
		inner_start: blockBegin.to,
		inner_end: blockEnd.from,
		outer_start: blockBegin.from,
		outer_end: blockEnd.to,
	};
};

const getCodeblockBoundNodes = (
	state: EditorState,
	pos: number = state.selection.main.from
): { begin: SyntaxNode; end: SyntaxNode } | null => {
	const tree = syntaxTree(state);
	const cursor = tree.cursor();
	cursor.childBefore(pos);

	if (!cursor.name.contains("codeblock")) {
		return null;
	}
	// If we're directly on a codeblock than it should be treated as not being in a codeblock.
	// since childBefore, we only have to check if pos is not outside the opening node.
	if (
		(cursor.name === OPEN_CODEBLOCK_NODE && pos <= cursor.to) ||
		cursor.name === CLOSE_CODEBLOCK_NODE
	) {
		return null;
	}
	do {
		if (cursor.name === OPEN_CODEBLOCK_NODE) {
			break;
		}
	} while (cursor.prev());
	const begin = cursor.node;
	if (!begin) {
		return null;
	}
	cursor.childAfter(pos);
	do {
		if (cursor.name === CLOSE_CODEBLOCK_NODE) {
			break;
		}
	} while (cursor.next());
	const end = cursor.node;
	if (!end || end.name !== CLOSE_CODEBLOCK_NODE) {
		return null;
	}
	return { begin, end };
};

type CodeblockLangInfo = Bounds & { codeblockLanguage: string };
const langIfWithinCodeblock = (
	state: EditorState
): CodeblockLangInfo | null => {
	const pos = state.selection.ranges[0].from;
	const coddeblockBounds = getCodeblockBoundNodes(state, pos);
	if (!coddeblockBounds) return null;
	const { begin: codeblockBegin, end: codeblockEnd } = coddeblockBounds

	// extract the language
	// codeblocks may start and end with an arbitrary number of backticks
	const language = state
		.sliceDoc(codeblockBegin.from, codeblockBegin.to)
		.replace(/`+|~+/g, "")

	return {
		inner_start: codeblockBegin.to,
		inner_end: codeblockEnd.from,
		outer_start: codeblockBegin.from,
		outer_end: codeblockEnd.to,
		codeblockLanguage: language,
	};
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
			const math_nodes_viewports: SyntaxNode[][] = [];
			view.visibleRanges.forEach(({ from, to }, i) => {
				math_nodes_viewports.push([]);
				tree.iterate({
					from,
					to,
					enter: (node: SyntaxNodeRef) => {
						// Don't include math nodes at the boundaries as in livepreview it means they are not rendered.
						if (
							(open_math_nodes.has(node.name) && node.to < to) ||
							(close_math_nodes.has(node.name) &&
								node.from > from)
						) {
							math_nodes_viewports[i].push(node.node);
						}
					},
				});
			});
			const temp_math_bounds: MathBounds[] = [];
			for (const math_nodes_viewport of math_nodes_viewports) {
				// nodes could be unbalanced or unbalanced in the viewport
				// - e.g., starting with a closing math node or ending with a opening math node
				if (close_math_nodes.has(math_nodes_viewport[0]?.name)) {
					const bounds = this.computeEquationBounds(view.state, math_nodes_viewport[0].from);
					if (bounds) {
						temp_math_bounds.push(bounds);
					}
				}
				const start_i = open_math_nodes.has(math_nodes_viewport[0]?.name)
					? 0
					: 1;
				for (let i = start_i; i < math_nodes_viewport.length - 1; i += 2) {
					const open_node = math_nodes_viewport[i];
					const close_node = math_nodes_viewport[i + 1];
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
						math_nodes_viewport[math_nodes_viewport.length - 1]?.name,
					)
				) {
					const last_node = math_nodes_viewport[math_nodes_viewport.length - 1];
					const bounds = this.computeEquationBounds(view.state, last_node.to);
					if (bounds) {
						temp_math_bounds.push(bounds);
					}
				}
			}
			this.mathBounds = temp_math_bounds.filter((val, i) => {
				if (i === 0) return true;
				const prev = temp_math_bounds[i - 1];
				if (prev.outer_start === val.outer_start && prev.outer_end === val.outer_end) {
					// duplicate bound, likely due to unbalanced math nodes in the viewport, so we skip it
					return false;
				}
				return true;
			});
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
				} else if ((pos <= bound.inner_start || pos >= bound.inner_end)) {
					break;
				}
				else {
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
			if (pos === undefined) pos = state.selection.main.to;
			const tree = syntaxTree(state);

			const cursor = tree.cursor();
			cursor.childBefore(pos);
			// Obsidian parses nested environments such as callouts and list incorrectly,
			// or it generates an incorrect tree. In such case we move left until we find a non-empty node.
			if (cursor.node.firstChild && cursor.name !== "Document") {
				let slicePos = pos;
				while (state.sliceDoc(slicePos, slicePos + 1) === "\n" && slicePos > 0) {
					slicePos -= 1;
				}
				cursor.moveTo(slicePos, -1);
			}
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

export const getMathBoundsPlugin = (view: EditorView) => {
	const plugin = view.plugin(mathBoundsPlugin)
	if (!plugin) {
		throw new Error("MathBoundsPlugin not found, something went wrong with the plugin initialization");
	}
	return plugin;
}
