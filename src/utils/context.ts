import { EditorState, SelectionRange, Text } from "@codemirror/state";
import {
	EditorView,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import {
	findMatchingBracket,
	getCloseBracket,
	stackResolveNodeIterate,
} from "src/utils/editor_utils";
import { Mode } from "../snippets/options";
import { Environment } from "../snippets/environment";
import { getLatexSuiteConfig } from "../snippets/codemirror/config";
import { syntaxTree } from "@codemirror/language";
import { SyntaxNode, SyntaxNodeRef } from "@lezer/common";
import { allTextAreas, MacroArea, snippetLessArea } from "./default_text_areas";
import { modifiedSyntaxTree } from "src/parser/language";
import { Type } from "src/parser/mathjax-parser";

const OPEN_INLINE_MATH_NODE =
	"formatting_formatting-math_formatting-math-begin_keyword_math";
const CLOSE_INLINE_MATH_NODE =
	"formatting_formatting-math_formatting-math-end_keyword_math_math-";

const OPEN_DISPLAY_MATH_NODE =
	"formatting_formatting-math_formatting-math-begin_keyword_math_math-block";
const CLOSE_DISPLAY_MATH_NODE =
	"formatting_formatting-math_formatting-math-end_keyword_math_math-";
export const open_math_nodes = new Set([
	OPEN_INLINE_MATH_NODE,
	OPEN_DISPLAY_MATH_NODE,
]);
export const close_math_nodes = new Set([
	CLOSE_INLINE_MATH_NODE,
	CLOSE_DISPLAY_MATH_NODE,
]);
const OPEN_CODEBLOCK_NODE =
	"HyperMD-codeblock_HyperMD-codeblock-begin_HyperMD-codeblock-begin-bg_HyperMD-codeblock-bg";
const CLOSE_CODEBLOCK_NODE =
	"HyperMD-codeblock_HyperMD-codeblock-bg_HyperMD-codeblock-end_HyperMD-codeblock-end-bg";
const CODE_NODE = "inline-code";

export type StackOutput = (
	| {
			kind: "command";
			name: string;
	  }
	| {
			kind: "environment";
			name: string;
	  }
	| { kind: "math" }
) &
	Bounds & { node: SyntaxNode };

type MacroStackOutput = StackOutput & { kind: "command" };
export interface Bounds {
	inner_start: number;
	inner_end: number;
	outer_start: number;
	outer_end: number;
}

export type CMBound = { from: number; to: number };
type MathBounds = Bounds & {
	mode: MathMode;
	tree: SyntaxNode | null;
	overlay: CMBound[];
};

type MathBoundWithTree = MathBounds & { tree: SyntaxNode };

export class Context implements PluginValue {
	view: EditorView;
	state: EditorState;
	mode: Mode;
	pos: number;
	ranges: SelectionRange[];
	codeblockLanguage: string | null = null;
	boundsCache: Map<number, Bounds | null>;
	innerBoundsCache: Map<number, Bounds | null>;
	shouldUpdate: boolean = false;

	constructor(view: EditorView) {
		this.updateFromView(view);
	}

	disableMath() {
		this.shouldUpdate = false;
		this.boundsCache.clear();
		this.innerBoundsCache.clear();
		this.mode = new Mode()
		const mathBounds = getMathBoundsPlugin(this.view, false);
		mathBounds.reset();
	}

	/**
	 * Small optimization to avoid updating the context when no extension is used.
	 * @param view current view
	 */
	init(view: EditorView) {
		if (this.shouldUpdate) {
			this.updateFromView(view);
			this.shouldUpdate = false;
		}
		return this
	}

	update(update: ViewUpdate) {
		if (!(update.docChanged || update.selectionSet || update.viewportChanged)) return;
		this.shouldUpdate = true;
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
		const inCodeBlock = codeblockLanguage !== null;
		const inCode = inCodeBlock ? false : withingCode(state)
		this.mode.code = inCode;

		const settings = getLatexSuiteConfig(state);
		const forceMath =
			inCodeBlock &&
			settings.forceMathLanguages.contains(codeblockLanguage);
		this.mode.codeMath = forceMath;
		this.mode.codeBlock = inCodeBlock && !forceMath ? codeblockLanguage : false;
		if (inCodeBlock && this.mode.codeBlock !== false) {
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
			const textEnv = this.inTextEnvironment();
			if (textEnv === "text") {
				this.mode.textEnv = true;
			} else if (textEnv === "none") {
				this.mode.snippetlessEnv = true;
			}
		}

		this.mode.text = !inCodeBlock && !inMath;

	}

	*getEnvNames(pos: number = this.pos): Generator<StackOutput, void, unknown> {
		const boundsPlugin = getMathBoundsPlugin(this.view);
		const bound = boundsPlugin.inMathBound(this.state, pos)
		if (!bound) return
		const treeNode = bound.tree
		if (!treeNode) return
	
		for (const node of stackResolveNodeIterate(treeNode, pos, -1)) {
			if (node.to <= pos) continue;
			if (node.name === "LaTeX") {
				// _printNode2(node, this.state.doc.toString())
			}
			const result = this.getEnvNameFromNode(node, this.state.doc);
			if (!result) continue;
			yield result;
		}
	}

	isWithinMacros(pos: number, macros: readonly MacroArea[]): StackOutput & { kind: "command" } | null {
		for (const result of this.getEnvNames(pos)) {
			if (result.kind=== "environment") continue;
			if (result.kind === "math") return null;
			const verifiedResult = isMacroArgumentCount(result, macros);
			if (verifiedResult) {
				return verifiedResult;
			}
		}
		return null;
	}
	getEnvNameFromNode(node: SyntaxNode, doc: Text): null | StackOutput {
		const value = node.name;
		function createEnvironment(
			envNode: SyntaxNode | null,
		): null | StackOutput {
			const beginNode = envNode?.getChild("BeginEnv");
			const envNameNode = beginNode?.getChild("EnvNameGroup");
			const contentNode = envNode?.getChild("Content");
			if (!envNameNode || !contentNode || !envNode) {
				return null;
			}
			return {
				kind: "environment",
				name: doc.sliceString(
					envNameNode.from + 1,
					envNameNode.to - 1,
				),
				inner_start: contentNode.from,
				inner_end: contentNode.to,
				outer_start: envNode.from,
				outer_end: envNode.to,
				node,
			};
		}

		if (value === "Environment") {
			return createEnvironment(node);
		} else if (value === "KnownEnvironment") {
			return createEnvironment(node.firstChild);
		} else if (value.endsWith("Argument")) {
			const parent = node.parent;
			const command = parent?.firstChild;
			const openBraced = node?.firstChild;
			const closeBraced = node?.lastChild;
			if (!command || !openBraced || !closeBraced) {
				return null;
			}
			return {
				kind: "command",
				name: doc.sliceString(command.from + 1, command.to),
				inner_start: openBraced.to,
				inner_end: closeBraced.from,
				outer_start: node.from,
				outer_end: closeBraced.to,
				node,
			};
		} else if (value === "ParenMath" || value === "DollarInlineMath") {
			value satisfies "ParenMath" | "DollarInlineMath";
			let openNode: SyntaxNode | null = null;
			let closeNode: SyntaxNode | null = null;
			if (value === "ParenMath") {
				openNode = node.getChild("OpenParenMath")!;
				closeNode = node.getChild("CloseParenMath")!;
			} else if (value === "DollarInlineMath") {
				const dollars = node.getChildren("Dollar")
				openNode = dollars[0] ?? null;
				closeNode = dollars[1] ?? null;
			}
			if (!openNode || !closeNode) {
				return null;
			}
			return {
				kind: "math",
				inner_end: closeNode.from,
				inner_start: openNode.to,
				outer_start: node.from,
				outer_end: node.to,
				node,
			}
		}
		return null;
	}

	isWithinEnvironment<T extends Environment>(pos: number, envs: T | T[]): T & Bounds | null {
		if (!this.mode.inMath()) return null;

		const bounds = this.getInnerBounds();
		if (!bounds) return null;

		const {inner_start: start, inner_end: end} = bounds;
		const text = this.state.sliceDoc(start, end);

		// pos referred to the absolute position in the whole document, but we just sliced the text
		// so now pos must be relative to the start in order to be any useful
		pos -= start;

		if (!Array.isArray(envs)) {
			envs = [envs];
		}
		outer_loop: for (const env of envs) {
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

				if (right === null) continue outer_loop;

				// Check whether the cursor lies inside the environment symbols
				if (right >= pos && pos >= left + env.openSymbol.length) {
					return {
						...env,
						inner_start: left + env.openSymbol.length + start,
						inner_end: right + start,
						outer_start: left + start,
						outer_end: right + env.closeSymbol.length + start,
					};
				}

				if (left <= 0) continue outer_loop;

				// Find the next open symbol
				left = text.lastIndexOf(env.openSymbol, left - 1);
			}
		}

		return null;
	}

	inTextEnvironment(): "text" | "none" | null {
		const result = this.isWithinMacros(this.pos, allTextAreas)
		if (!result) return null;
		const openSymbol = result.name;
		if (snippetLessArea.some(macro => macro.name === openSymbol)) {
			return "none"
		} else {
			return "text"
		}
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

}

export const contextPlugin = ViewPlugin.fromClass(Context);
export const getContextPlugin = (view: EditorView, init: boolean = true): Context => {
	const plugin = view.plugin(contextPlugin)
	if (!plugin) {
		throw new Error("Context plugin not found, something went wrong with the plugin initialization");
	}
	return init ? plugin.init(view) : plugin;
}


export function isMacroArgumentCount(stack: Readonly<MacroStackOutput>, macros: readonly MacroArea[]): null | MacroStackOutput {
	const macro = macros.find((macro) => macro.name === stack.name);
	if (!macro) return null;
	if (!macro.arguments) return stack;

	let sibling_count: number = 0;
	let sibling: SyntaxNode | null = stack.node
	while ((sibling = sibling.prevSibling) !== null) {
		if (sibling.name.endsWith("Argument")) {
			sibling_count++;
		}
	}
	if (!macro.arguments.includes(sibling_count)) {
		return null
	}
	return stack
}

export enum MathMode {
	InlineMath,
	BlockMath,
	CodeMath
}

// Accounts for equations within text environments, e.g. $$\text{... $...$}$$
const getInnerEquationBounds = (view: EditorView, pos?: number ):Bounds | null => {
	if (!pos) pos = view.state.selection.main.to;
	const bounds = getMathBoundsPlugin(view).inMathBound(view.state, pos);
	if (!bounds) return null;
	let text = view.state.sliceDoc(bounds.inner_start, bounds.inner_end);

	// ignore \$
	text = text.replaceAll("\\$", "\\R");

	const left = text.lastIndexOf("$", pos - 1);
	const right = text.indexOf("$", pos);

	if (left === -1 || right === -1) return bounds;

	return {
		inner_start: left + 1,
		inner_end: right,
		outer_start: left,
		outer_end: right + 1,
	};
};

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
	pos: number = state.selection.main.from,
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
	state: EditorState,
): CodeblockLangInfo | null => {
	const pos = state.selection.ranges[0].from;
	const coddeblockBounds = getCodeblockBoundNodes(state, pos);
	if (!coddeblockBounds) return null;
	const { begin: codeblockBegin, end: codeblockEnd } = coddeblockBounds;

	// extract the language
	// codeblocks may start and end with an arbitrary number of backticks
	const language = getLangFromCodeblockNode(state, codeblockBegin);

	return {
		inner_start: codeblockBegin.to,
		inner_end: codeblockEnd.from,
		outer_start: codeblockBegin.from,
		outer_end: codeblockEnd.to,
		codeblockLanguage: language,
	};
};

function getLangFromCodeblockNode(
	state: EditorState,
	node: SyntaxNode,
): string {
	return state
		.sliceDoc(node.from, node.to)
		.replace(/`+|~+/g, "")
		.split(" ")[0];
}

const withingCode = (state: EditorState): boolean => {
	const pos = state.selection.main.head;
	const tree = syntaxTree(state);
	return tree.resolveInner(pos, -1).name.contains(CODE_NODE);
};

type EquationInfo = { text: string; bound: MathBoundWithTree, overlay: CMBound };

class MathBoundsPlugin implements PluginValue {
	private _mathBounds: MathBounds[] = [];
	private equationsOverlays: EquationInfo[] | null = null;
	shouldUpdate: boolean = false;

	get mathBounds() {
		return this._mathBounds
	}

	constructor(view: EditorView) {
		this.updateMathBounds(view);
	}

	reset() {
		this._mathBounds = [];
		this.equationsOverlays = null;
		this.shouldUpdate = false;
	}

	getTree(state: EditorState) {
		return modifiedSyntaxTree(state);
	}

	init(view: EditorView) {
		if (this.shouldUpdate) {
			this.equationsOverlays = null;
			this.updateMathBounds(view);
			this.shouldUpdate = false;
		}
		return this;
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.shouldUpdate = true;
		}
	}

	getDollarBounds(node: SyntaxNode): {open: CMBound, close: CMBound} {
		const open = node.firstChild!;
		const close =
			node.lastChild!.name === "Dollar"
				? node.lastChild!
				: { from: node.to, to: node.to };
		return {
			open,
			close
		}
	}

	updateMathBounds(view: EditorView) {
		const tree = modifiedSyntaxTree(view.state);
		const ranges: MathBounds[] = [];
		for (const { from, to } of view.visibleRanges) {
			tree.iterate({
				from,
				to,
				enter: (nodeRef: SyntaxNodeRef) => {
					if (nodeRef.name === Type.DollarDisplayBlockMath) {
						const { open, close } = this.getDollarBounds(nodeRef.node);
						const children = nodeRef.node.getChildren("DisplayMath")
						if (children.length === 0) {
							ranges.push({
								inner_start: open.to,
								inner_end: close.from,
								outer_start: open.from,
								outer_end: close.to,
								mode: MathMode.BlockMath,
								tree: null,
								overlay: [],
							})
							return;
						}

						const tree = nodeRef.node.enter(children[children.length - 1].to, -1);
						if (!tree) {
							return;
						}

						ranges.push({
							inner_start: open.to,
							inner_end: close.from,
							outer_start: open.from,
							outer_end: close.to,
							mode: MathMode.BlockMath,
							tree,
							overlay: children,
						});
					} else if (
						nodeRef.name === Type.DollarInlineMath ||
						nodeRef.name === Type.DollarDisplayMath
					) {
						const { open, close } = this.getDollarBounds(nodeRef.node);
						const tree = nodeRef.node.getChild("LaTeX");
						if (!tree) {
							return
						}
						const mode = nodeRef.name === Type.DollarInlineMath ? MathMode.InlineMath : MathMode.BlockMath;
						ranges.push({
							inner_start: open.to,
							inner_end: close.from,
							outer_start: open.from,
							outer_end: close.to,
							mode,
							tree,
							overlay: [tree],
						});
					}
				},
			});
		}
		this._mathBounds = ranges;
	}

	inMathBound(_state: EditorState, pos: number): MathBounds | null {
		const bounds = this._mathBounds;
		if (
			pos < bounds[0]?.outer_start ||
			pos > bounds[bounds.length - 1]?.outer_end
		) {
			return null;
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
			} else if (
				pos < bound.inner_start &&
				bound.mode == MathMode.BlockMath &&
				bound.inner_start - bound.outer_start == 2
			) {
				return {
					outer_start: bound.outer_start,
					inner_start: bound.outer_start + 1,
					inner_end: bound.outer_start + 1,
					outer_end: bound.outer_start + 2,
					mode: MathMode.InlineMath,
					tree: null,
					overlay: [],
				};
			} else if (pos < bound.inner_start || pos > bound.inner_end) {
				break;
			} else {
				return bound;
			}
		}
		return null;
	};

	// TODO: maybe support math bounds outside viewport. But not sure if its needed.

	getEquationOverlays(state: EditorState) {
		if (this.equationsOverlays)
			return this.equationsOverlays;
		this.equationsOverlays = this._mathBounds.map((bound) =>
			bound.overlay.length === 0 || bound.tree === null ? null :
			{
				bound,
				overlay: {from: bound.overlay[0].from, to: bound.overlay[bound.overlay.length - 1].to},
				text: state.sliceDoc(bound.overlay[0].from, bound.overlay[bound.overlay.length - 1].to),
			}		
		).filter((x): x is EquationInfo => x !== null);
		return this.equationsOverlays;
	}
}

export const mathBoundsPlugin = ViewPlugin.fromClass(MathBoundsPlugin);

export const getMathBoundsPlugin = (view: EditorView, init: boolean = true) => {
	const plugin = view.plugin(mathBoundsPlugin);
	if (!plugin) {
		throw new Error(
			"MathBoundsPlugin not found, something went wrong with the plugin initialization",
		);
	}
	return init ? plugin.init(view) : plugin;
};
