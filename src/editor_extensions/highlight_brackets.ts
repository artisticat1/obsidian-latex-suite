import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin } from "@codemirror/view";
import { Prec, Range } from "@codemirror/state";
import { CMBound, getContextPlugin, getMathBoundsPlugin } from "src/utils/context";
import { tempKeyPress } from "src/snippets/snippet_management";
import { EquationText, findIndexReverse, iterateTreeCursor } from "src/utils/tokenizer";
import { walkPairedBrackets } from "src/utils/tokenizer";
import { SyntaxNode, TreeCursor } from "@lezer/common";
import * as latex from "src/parser/mathjax/latex-parser.terms";

const Ncolors = 3;

/**
 * Helper function to create a decoration to highlight a bracket at a given position
 * @param pos the start position of the bracket in the document
 * @param className Css class to apply to the decoration
 * @param bracket the bracket character(s) to highlight
 * @returns
 */
function getHighlightBracketMark(pos: number, className: string, bracket: number):Range<Decoration> {
	return Decoration.mark({
		inclusive: true,
		attributes: {},
		class: className
	}).range(pos, pos + bracket);
}

type BracketConcealment = {
	pos: number,
	className: string,
	bracket: number,
};

const bracket_delimiters = {
	"{": "}",
	"[": "}",
	"(": ")",
	"\\{": "\\}",
	// these don't neccessarily have to be paired: but they often do so we treat them like a pair.
	"\\left<": "\\right>",
	"\\langle ": "\\rangle",
	"\\lvert": "\\rvert",
	"\\lVert": "\\rVert",
	"\\right\\lt": "\\right\\gt",
	"\\lbrace": "\\rbrace",
	"\\lbrack": "\\rbrack",
	"\\lceil": "\\rceil",
	"\\lfloor": "\\rfloor",
	"\\lgroup": "\\rgroup",
	"\\llcorner": "\\lrcorner",
	"\\lmoustache": "\\rmoustache",
	"\\lparen": "\\rparen",
};

const reverse_bracket_delimiters = Object.fromEntries(
	Object.entries(bracket_delimiters).map(([open, close]) => [close, open])
);
	
function handleDelimitedGroup(cursor: TreeCursor, doc: EquationText): BracketResult[] {
	const open = cursor.node.getChild(latex.MathOpening);
	const close = cursor.node.getChild(latex.MathClosing);
	const mathNode = cursor.node.getChild(latex.Math)
	const mathDelimiters = mathNode
		? traverseTree(
				mathNode,
				new EquationText(
					doc.eqn,
					mathNode.from,
					mathNode.to,
					doc.offset,
				),
			)
		: [];
	if (!open || !close) {
		return []
	}
	const to = close?.to ?? open.to;
	if (to) {
		cursor.moveTo(to, -1)
	}
	let bracket: BracketResult
	if (open && close) {
		bracket = {
			kind: "bracket",
			open,
			close,
			children: mathDelimiters,
		}
		return [bracket]
	} else if (open) {
		bracket =  {
			kind: "error_open",
			open,
			bracket: doc.slice(open.from, open.to),
		}
		return [bracket, ...mathDelimiters]
	} else if (close) {
		const closeBracket = doc.slice(close.from, close.to);
		bracket =  {
			kind: "error_close",
			close,
			bracket: closeBracket,
		}
		return [...mathDelimiters, bracket]
	}
	return []
}


type BracketOpen = {
	kind: "error_open";
	bracket: string;
	open: CMBound;
}

type BracketClose = {
	kind: "error_close";
	bracket: string;
	close: CMBound;
}

type BracketPair = {
	kind: "bracket";
	open: CMBound;
	close: CMBound;
	children: BracketResult[];
}


type BracketResult = BracketPair | BracketOpen | BracketClose; 
	
function handleCtrlSeq(cursor: TreeCursor, doc: EquationText): BracketResult[] {
	const node = cursor.node
	const macro = doc.slice(node.from, node.to);	
	const isOpen = macro in bracket_delimiters;
	const isClose = macro in reverse_bracket_delimiters;
	let bracket: BracketResult;
	if (isOpen) {
		bracket = {
			kind: "error_open",
			open: node,
			bracket: doc.slice(node.from, node.to),
		}
	} else if (isClose) {
		bracket = {
			kind: "error_close",
			close: node,
			bracket: doc.slice(node.from, node.to),
		}
	} else {
		return [];
	}
	return [bracket];
}

const openBraceMap = {
	"OpenBrace": "CloseBrace",
	"OpenBracket": "CloseBracket",
	"OpenParenMath": "CloseParenMath"
}

function handleOpenBrace(cursor: TreeCursor, doc: EquationText): BracketResult[] {
	const node = cursor.node;
	const open = node;
	const closeName = openBraceMap[node.name as keyof typeof openBraceMap];
	const inBetween: BracketResult[] = [];
	while (cursor.nextSibling()) {
		const sibling = cursor.node;
		if (sibling && sibling.name === closeName) {
			const close = sibling;
			return [{
				kind: "bracket",
				open,
				close,
				children: inBetween,
			}]
		} else if (sibling) {
			const newDoc = new EquationText(doc.eqn, sibling.from, sibling.to, doc.offset);
			inBetween.push(...traverseTree(sibling, newDoc));
		}
	}
	return [{
		kind: "error_open",
		open,
		bracket: doc.slice(open.from, open.to),
	}, ...inBetween]
}

function handleMathSpecialChar(cursor: TreeCursor, doc: EquationText): BracketResult[] {
	const chars = doc.slice(cursor.from, cursor.to)
	const brackets: BracketResult[] = []
	for (let i=0; i < chars.length; i++) {
		const char = chars[i];
		const bound = {from: cursor.from + i, to: cursor.from + i + 1};
		const isOpen = char in bracket_delimiters;
		const isClose = char in reverse_bracket_delimiters;
		if (isOpen) {
			brackets.push({
				kind: "error_open",
				open: bound,
				bracket: doc.slice(bound.from, bound.to),
			})
		} else if (isClose) {
			brackets.push({
				kind: "error_close",
				close: bound,
				bracket: doc.slice(bound.from, bound.to),
			})
		}
	}
	return brackets
}

type Handler = (cursor: TreeCursor, doc: EquationText) => BracketResult[];

export function traverseTree(topNode: SyntaxNode, doc: EquationText): BracketResult[] {
	const specs: BracketResult[] = [];
	const nameMap: Record<number, Handler> = {
		[latex.MathDelimitedGroup]: handleDelimitedGroup
	}
	for (const cursor of iterateTreeCursor(topNode, doc)) {
		const node = cursor.node;
		const handler = nameMap[node.type.id];
		if (handler) {
			const region = handler(cursor, doc);
			specs.push(...region);
		} else if (node.name.endsWith("CtrlSeq") || node.type.is(latex.CtrlSym)) {
			specs.push(...handleCtrlSeq(cursor, doc));
		} else if (node.type.is(latex.MathSpecialChar)) {
			specs.push(...handleMathSpecialChar(cursor, doc))
		} else if (
			node.type.is(latex.OpenBrace) ||
			node.type.is(latex.OpenBracket) ||
			node.type.is(latex.OpenParenMath)
		) {
			specs.push(...handleOpenBrace(cursor, doc));
		} else if (
			node.type.is(latex.CloseBrace) ||
			node.type.is(latex.CloseBracket)
		) {
			specs.push({
				kind: "error_close",
				close: node,
				bracket: doc.slice(node.from, node.to),
			});
		}
	}	
	return specs;
}

type PairedBracketParent = PairedBrackets & {kind: "error_open" | "bracket"} | null;
export type PairedBrackets = BracketResult & {
	parent: PairedBracketParent;
	children: PairedBrackets[];
}

// syntax brackets like \left...\right and {} have priority over normal brackets like () or \lvert \rvert.
// This does make parsing a bit awkward.
export function pairBrackets(specs: BracketResult[]) {
	const paired: PairedBrackets[] = [];
	let parent: PairedBracketParent = null;
	const openStack: (PairedBrackets & {kind: "error_open"})[] = [];
	for (let i=0; i < specs.length; i++) {
		const children = parent?.children ?? paired;
		const spec = specs[i];
		const pairedSpec: PairedBrackets = {
			...spec,
			parent,
			children: [],
		};
		if (pairedSpec.kind === "error_open") {
			openStack.push(pairedSpec);
			children.push(pairedSpec);
			parent = pairedSpec;
		} else if (pairedSpec.kind === "error_close") {
			const bracket: string = reverse_bracket_delimiters[pairedSpec.bracket];
			const index = findIndexReverse(openStack, (open) => open.bracket === bracket);

			if (index !== null) {
				const open = openStack[index];
				parent = open
				openStack.length = index;
				Object.assign(open, {
					kind: "bracket",
					close: pairedSpec.close,
				});
				parent = open.parent;
			} else {
				children.push(pairedSpec);
			}
		} else if (pairedSpec.kind === "bracket" && spec.kind === "bracket") {
			children.push(pairedSpec);
			const pairChildrenResults = pairBrackets(spec.children)

			pairChildrenResults.forEach((child) => {
				child.parent = pairedSpec;
				pairedSpec.children.push(child);
			});
		}
	}
	return paired 
}

type ColorBracketsCachedEquations = Record<string, BracketConcealment[]>;
/**
 * Colorizes paired brackets just like in VSCode. Mismatched brackets are highlighted in red,
 * this includes macros that act like brackets excluding \left and \right.
 * @param view current editor view
 * @param cached_equations previously cached equations to avoid re-tokenizing them
 * @returns new decorations and the updated cached equations
 */
function colorPairedBrackets(view: EditorView, cached_equations: ColorBracketsCachedEquations) {
	const overlays = getMathBoundsPlugin(view).getEquationOverlays(view.state);
	const new_equations: typeof cached_equations = {};
	const widgets: Range<Decoration>[] = [];
	for (const eqn_info of overlays) {
		if (eqn_info.text in cached_equations) {
			new_equations[eqn_info.text] = cached_equations[eqn_info.text];
			for (const spec of cached_equations[eqn_info.text]) {
				widgets.push(getHighlightBracketMark(spec.pos + eqn_info.overlay.from, spec.className, spec.bracket));
			}
			continue
		}
		const doc = new EquationText(eqn_info.text, eqn_info.overlay.from, eqn_info.overlay.to);
		const traversedTokens = traverseTree(eqn_info.bound.tree, doc);
		const tokens = pairBrackets(traversedTokens);
		const localSpecs: BracketConcealment[] = [];
		for (const {region: token, depth} of walkPairedBrackets(tokens)) {
			if (token.kind === "error_close" || token.kind === "error_open") {
				const pos = token.kind === "error_open" ? token.open.from : token.close.from;
				localSpecs.push({
					pos,
					className: "latex-suite-mismatched-bracket",
					bracket: token.bracket.length,
				});
				continue;
			}
			
			const colorIndex = depth % Ncolors;
			localSpecs.push({
				pos: token.open.from,
				className: `latex-suite-color-bracket-${colorIndex}`,
				bracket: token.open.to - token.open.from,
			});
			localSpecs.push({
				pos: token.close.from,
				className: `latex-suite-color-bracket-${colorIndex}`,
				bracket: token.close.to - token.close.from
			});
		}
		widgets.push(
			...localSpecs.map(spec => getHighlightBracketMark(
				spec.pos,
				spec.className,
				spec.bracket,
			))
		)
		
		new_equations[eqn_info.text] = localSpecs.map((spec) => ({
			...spec,
			pos: spec.pos - doc.offset,
		}));
	}
	cached_equations = new_equations;

	const decorations = Decoration.set(widgets, true);
	return { decorations, cached_equations  };
}

function highlightCursorBrackets(view: EditorView) {

	const widgets: Range<Decoration>[] = []
	const selection = view.state.selection;
	const ranges = selection.ranges;
	const ctx = getContextPlugin(view);

	if (!ctx.mode.inMath()) {
		return Decoration.none;
	}

	const overlays = getMathBoundsPlugin(view).getEquationOverlays(view.state);
	for (const range of ranges) {
		const covered_overlays = overlays.find((o) => o.overlay.from <= range.from && o.bound.inner_end >= o.overlay.to);
		if (!covered_overlays) {
			continue;
		}
		const doc = new EquationText(covered_overlays.text, covered_overlays.overlay.from, covered_overlays.overlay.to);
		const tokens = pairBrackets(traverseTree(covered_overlays.bound.tree, doc));
		let prev_token: null | {
			region: PairedBrackets & { kind: "bracket" };
			depth: number;
		} = null;
		const eqn_range = {from: range.from, to: range.to, empty: range.empty}
		for (const {region: token, depth} of walkPairedBrackets(tokens)) {
			if (token.kind !== "bracket") {
				continue;
			}
			// highlight closest matching brackets inside the selection where the ends are included
			if (
				!eqn_range.empty &&
				((token.close.to <= eqn_range.to &&
					token.close.to >= eqn_range.from) ||
					(token.open.from >= eqn_range.to &&
						token.open.from <= eqn_range.from))
			) {
				prev_token = {
					region: token,
					depth: depth,
				};
				break;
			}
			// highlight the innermost enclosing matching brackets if the selection is empty
			if (token.open.from <= eqn_range.to && token.close.to >= eqn_range.to) {
				prev_token = {
					region: token,
					depth: depth,
				};
				continue;
			}
			if (token.open.from > eqn_range.to) {
				break
			}
		}
		if (!prev_token) continue
		widgets.push(
			getHighlightBracketMark(
				prev_token.region.open.from,
				"latex-suite-highlighted-bracket",
				prev_token.region.open.to - prev_token.region.open.from,
			),
			getHighlightBracketMark(
				prev_token.region.close.from,
				"latex-suite-highlighted-bracket",
				prev_token.region.close.to - prev_token.region.close.from,
			),
		);
	}

	return Decoration.set(widgets, true);
}


export const colorPairedBracketsPlugin = ViewPlugin.fromClass(class {
	decorations: DecorationSet;
	cached_equations: ColorBracketsCachedEquations={};

	constructor(view: EditorView) {
		({
			decorations: this.decorations,
			cached_equations: this.cached_equations,
		} = colorPairedBrackets(view, this.cached_equations));
	}

	update(update: ViewUpdate) {
		if (update.transactions.some(tr => tr.annotation(tempKeyPress))) {
			return;
		}
		if (update.docChanged || update.viewportChanged) {
			({
				decorations: this.decorations,
				cached_equations: this.cached_equations,
			} = colorPairedBrackets(update.view, this.cached_equations));
		}
	}

}, { decorations: v => v.decorations, });


export const colorPairedBracketsPluginLowestPrec = Prec.lowest(colorPairedBracketsPlugin.extension);

export const highlightCursorBracketsPlugin = ViewPlugin.fromClass(class {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = highlightCursorBrackets(view);
	}

	update(update: ViewUpdate) {
		if (update.transactions.some(tr => tr.annotation(tempKeyPress))) {
			return;
		}
		if (update.docChanged || update.selectionSet)
			this.decorations = highlightCursorBrackets(update.view);
	}

}, { decorations: v => v.decorations, });
