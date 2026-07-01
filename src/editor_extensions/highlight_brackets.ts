import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin } from "@codemirror/view";
import { Prec, Range } from "@codemirror/state";
import { getContextPlugin, getMathBoundsPlugin } from "src/utils/context";
import { tempKeyPress } from "src/snippets/snippet_management";
import { tokenize_brackets, walkTokens, Region } from "src/utils/tokenizer";

const Ncolors = 3;

/**
 * Helper function to create a decoration to highlight a bracket at a given position
 * @param pos the start position of the bracket in the document
 * @param className Css class to apply to the decoration
 * @param bracket the bracket character(s) to highlight
 * @returns 
 */
function getHighlightBracketMark(pos: number, className: string, bracket: string):Range<Decoration> {
	return Decoration.mark({
		inclusive: true,
		attributes: {},
		class: className
	}).range(pos, pos + (bracket.length || 1));
}

type BracketConcealment = {
	pos: number,
	className: string,
	bracket: string,
};

const bracket_delimiters = [
	["{","}"],
	["[","]"],
	["(",")"],
	["\\(", "\\)"],
	// these don't neccessarily have to be paired, but they often do so we treat them like a pair.
	["\\left<","\\right>"],
	["\\langle ", "\\rangle"],
	["\\lvert", "\\rvert"],
	["\\lVert", "\\rVert"],
	["\\right\\lt", "\\right\\gt"],	
	["\\lbrace", "\\rbrace"],
	["\\lbrack", "\\rbrack"],
	["\\lceil", "\\rceil"],
	["\\lfloor", "\\rfloor"],
	["\\lgroup", "\\rgroup"],
	["\\llcorner", "\\lrcorner"],
	["\\lmoustache", "\\rmoustache"],
	["\\lparen", "\\rparen"],
] as const

type ColorBracketsCachedEquations = Record<string, BracketConcealment[]>;
/**
 * Colorizes paired brackets just like in VSCode. Mismatched brackets are highlighted in red,
 * this includes macros that act like brackets excluding \left and \right.
 * @param view current editor view
 * @param cached_equations previously cached equations to avoid re-tokenizing them
 * @returns new decorations and the updated cached equations
 */
function colorPairedBrackets(view: EditorView, cached_equations: ColorBracketsCachedEquations) {
	const equations = getMathBoundsPlugin(view).getEquations(view.state);
	const new_equations: typeof cached_equations = {};
	for (const [start, eqn] of equations.entries()) {
		if (eqn in cached_equations) {
			new_equations[eqn] = cached_equations[eqn];
			continue
		}
		const tokens = tokenize_brackets(eqn, bracket_delimiters, view.state, start)
		const localSpecs: BracketConcealment[] = [];
		for (const {region: token, depth} of walkTokens(tokens)) {
			if (token.kind === "error_close" || token.kind === "error_open") {
				const pos = token.kind === "error_open" ? token.outer_start : token.inner_end;
				localSpecs.push({
					pos,
					className: "latex-suite-mismatched-bracket",
					bracket: token.kind === "error_open" ? token.open : token.close
				});
				continue;
			}
			const colorIndex = depth % Ncolors;
			localSpecs.push({
				pos: token.outer_start,
				className: `latex-suite-color-bracket-${colorIndex}`,
				bracket: token.open
			});
			localSpecs.push({
				pos: token.inner_end,
				className: `latex-suite-color-bracket-${colorIndex}`,
				bracket: token.close
			});
		}
		new_equations[eqn] = localSpecs;
	}
	cached_equations = new_equations;
	
	const widgets: Range<Decoration>[] = [];
	for (const [start, eqn] of equations.entries()) {
		const localSpecs = new_equations[eqn];
		if (!localSpecs) continue;
		for (const spec of localSpecs) {
			widgets.push(getHighlightBracketMark(start + spec.pos, spec.className, spec.bracket));
		}
	}
	
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

	// const openBrackets = ["{", "[", "("];
	// const brackets = ["{", "[", "(", "}", "]", ")"];

	for (const range of ranges) {
		const bounds = ctx.getBounds(range.to);
		if (!bounds) {
			continue;
		}
		const eqn = view.state.doc.sliceString(
			bounds.inner_start,
			bounds.inner_end,
		);
		const tokens = tokenize_brackets(eqn, bracket_delimiters, view.state, bounds.inner_start);
		let prev_token: null | {
			region: Region<string, string> & { kind: "bracket" };
			depth: number;
		} = null;
		const eqn_range = {from: range.from - bounds.inner_start, to: range.to - bounds.inner_start, empty: range.empty}
		for (const {region: token, depth} of walkTokens(tokens)) {
			if (token.kind !== "bracket") {
				continue;
			}
			// highlight closest matching brackets inside the selection where the ends are included
			if (
				!eqn_range.empty &&
				((token.outer_end <= eqn_range.to &&
					token.outer_end >= eqn_range.from) ||
					(token.outer_start >= eqn_range.to &&
						token.outer_start <= eqn_range.from))
			) {
				prev_token = {
					region: token,
					depth: depth,
				};
				break;
			}
			// highlight the innermost enclosing matching brackets if the selection is empty
			if (token.outer_start <= eqn_range.to && token.outer_end >= eqn_range.to) {
				prev_token = {
					region: token,
					depth: depth,
				};
				continue;
			} 
			if (token.outer_start > eqn_range.to) {
				break
			}
		}
		if (!prev_token) continue
		widgets.push(
			getHighlightBracketMark(
				prev_token.region.outer_start + bounds.inner_start,
				"latex-suite-highlighted-bracket",
				prev_token.region.open,
			),
			getHighlightBracketMark(
				prev_token.region.inner_end + bounds.inner_start,
				"latex-suite-highlighted-bracket",
				prev_token.region.close,
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
