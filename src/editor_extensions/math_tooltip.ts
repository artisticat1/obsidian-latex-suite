import { Tooltip, showTooltip, EditorView, ViewUpdate } from "@codemirror/view";
import { StateField, EditorState, EditorSelection, StateEffect } from "@codemirror/state";
import { renderMath, finishRenderMath, editorLivePreviewField } from "obsidian";
import { Bounds, Context, getContextPlugin } from "src/utils/context";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { syntaxTree } from "@codemirror/language";

type MathTooltip = {
	equation: string,
	bounds: Bounds,
	pos: number,
	tooltip: Tooltip,
}
const updateTooltipEffect = StateEffect.define<MathTooltip[]>();

export const cursorTooltipField = StateField.define<readonly MathTooltip[]>({
	create: () => [],

	update(tooltips, tr) {
		for (const effect of tr.effects) {
			if (effect.is(updateTooltipEffect)) return effect.value;
		}

		return tooltips;
	},

	provide: (f) => showTooltip.computeN([f], (state) => state.field(f).map(t=> t.tooltip)),
});
	
const findMatchingBrackets = (text: string, cursorPos: number, openBracket: string, closeBracket: string): {left: number, right: number} => {
	const aux = (text: string, start: number, openBracket: string, closeBracket: string, direction: -1 | 1): number => {
		let depth = 0;
		for (let i = start; i >= 0 && i < text.length; i += direction) {
			if (text[i] === openBracket) depth++;
			if (text[i] === closeBracket) {
				if (depth === 0) return i;
				depth--;
			}
		}
		return -1;
	};

	// If the cursor is right before a close bracket, that doesn't count to balancing the brackets.
	const leftStart = text[cursorPos] === closeBracket ? cursorPos - 1 : cursorPos;
	const left = aux(text, leftStart, closeBracket, openBracket, -1);
	const right = aux(text, cursorPos, openBracket, closeBracket, 1);
	return { left, right };
}

// update the tooltip by dispatching an updateTooltipEffect
export function handleMathTooltip(update: ViewUpdate) {
	const shouldUpdate = update.docChanged || update.selectionSet;
	if (!shouldUpdate) return;
	const settings = getLatexSuiteConfig(update.state);
	
	// We don't need to update the tooltip every time the cursor moves. 
	// Only update when we leaf or enter a LaTeX block. High impact.
	const ctx = getContextPlugin(update.view);
	const eqnBounds = shouldShowTooltip(update.state, ctx);

	if (!eqnBounds) {
		const currTooltips = update.state.field(cursorTooltipField);
		// a little optimization:
		// If the tooltip is not currently shown and there is no need to show it,
		// we don't dispatch an transaction.
		if (currTooltips.length > 0) {
			update.view.dispatch({
				effects: [updateTooltipEffect.of([])],
			});
		}
		return;
	}

	/*
	* process when there is a need to show the tooltip: from here
	*/

	const eqn = update.state.sliceDoc(eqnBounds.inner_start, eqnBounds.inner_end);
	const pos = ctx.pos;

	const tree = syntaxTree(update.state);
	const cursor = tree.cursor();
	cursor.moveTo(pos, -1);
	let normalizedPos: number;
	if (cursor.name === "math_tag" && cursor.from < pos && cursor.to >= pos) {
		normalizedPos = cursor.from;
	} else {
		normalizedPos = pos
	}
	const eqnPos = normalizedPos - eqnBounds.inner_start;

	let eqnWithDecorations: string;
	const { left, right } = settings.mathPreviewBracketHighlighting
		? findMatchingBrackets(eqn, eqnPos, "{", "}")
		: { left: -1, right: -1 };

	if (right !== -1 && left !== -1) {
		// If the cursor is next to a bracket, move it inside the bracket pair
		// case when eqnPos === left
		const maxPosOrLeft = Math.max(left + 1, eqnPos);
		eqnWithDecorations =
			eqn.slice(0, left + 1) +
			// `\class` doesn't work, so using style and adding it back in as workaround.
			"\\style{background-color: var(--latex-suite-math-preview-highlight);}{" +
			eqn.slice(left + 1, maxPosOrLeft) +
			settings.mathPreviewCursor +
			eqn.slice(maxPosOrLeft, right) +
			"}" +
			eqn.slice(right);
	} else {
		eqnWithDecorations =
			eqn.slice(0, eqnPos) +
			settings.mathPreviewCursor +
			eqn.slice(eqnPos);
	}
	const oldTooltips = update.state.field(cursorTooltipField);
	// a little optimization: if the tooltip is currently shown and the equation with decorations is the same as the one in the tooltip, we don't need to update it.
	if (
		oldTooltips.length === 1 &&
		oldTooltips[0].equation === eqnWithDecorations &&
		oldTooltips[0].bounds.inner_start === eqnBounds.inner_start &&
		oldTooltips[0].bounds.inner_end === eqnBounds.inner_end
	) {
		return;
	}

	const above = settings.mathPreviewPositionIsAbove;
	const create = () => {
		const dom = document.createElement("div");
		dom.addClass("cm-tooltip-cursor");

		try {
			const renderedEqn = renderMath(eqnWithDecorations, ctx.mode.blockMath || ctx.mode.codeMath);
			const highlight = renderedEqn.querySelector(
				'[style*="background-color: var(--latex-suite-math-preview-highlight)"]',
			) as HTMLElement;
			highlight?.addClass("latex-suite-math-preview-highlight");
			highlight?.style.removeProperty("background-color");
			dom.appendChild(renderedEqn);
			finishRenderMath();
		} catch (e) {
			console.error("Error rendering math in tooltip:", e);
			dom.textContent = eqn
		}

		return { dom };
	};

	let newTooltips: Tooltip[] = [];

	if (ctx.mode.blockMath || ctx.mode.codeMath) {
		newTooltips = [{
			pos: above ? eqnBounds.inner_start : eqnBounds.inner_end,
			above: above,
			strictSide: true,
			arrow: true,
			create: create,
		}];
	} else if (ctx.mode.inlineMath && above) {
		newTooltips = [{
			pos: eqnBounds.inner_start,
			above: true,
			strictSide: true,
			arrow: true,
			create: create,
		}];
	} else if (ctx.mode.inlineMath && !above) {
		const endRange = EditorSelection.range(eqnBounds.inner_end, eqnBounds.inner_end);

		newTooltips = [{
			pos: Math.max(
				eqnBounds.inner_start,
				// the beginning position of the visual line where eqnBounds.end is
				// located
				update.view.moveToLineBoundary(endRange, false).anchor,
			),
			above: false,
			strictSide: true,
			arrow: true,
			create: create,
		}];
	}

	update.view.dispatch({
		effects: [
			updateTooltipEffect.of(
				newTooltips.map((t) => ({
					equation: eqnWithDecorations,
					bounds: eqnBounds,
					pos: t.pos,
					tooltip: t,
				})),
			),
		],
	});
}

function shouldShowTooltip(state: EditorState, ctx: Context): Bounds | null {
	if (!ctx.mode.inMath()) return null;

	const isLivePreview = state.field(editorLivePreviewField);
	if (ctx.mode.blockMath && isLivePreview) return null;

	// FIXME: eqnBounds can be null
	const eqnBounds = ctx.getBounds();
	if (!eqnBounds) return null;

	// Don't render an empty equation
	const eqn = state.sliceDoc(eqnBounds.inner_start, eqnBounds.inner_end).trim();
	if (eqn === "") return null;

	return eqnBounds;
}

export const cursorTooltipBaseTheme = EditorView.baseTheme({
	".cm-tooltip.cm-tooltip-cursor": {
		backgroundColor: "var(--background-secondary)",
		color: "var(--text-normal)",
		border: "1px solid var(--background-modifier-border-hover)",
		padding: "4px 6px",
		borderRadius: "6px",
		"& .cm-tooltip-arrow:before": {
			borderTopColor: "var(--background-modifier-border-hover)",
			borderBottomColor: "var(--background-modifier-border-hover)",
		},
		"& .cm-tooltip-arrow:after": {
			borderTopColor: "var(--background-secondary)",
			borderBottomColor: "var(--background-secondary)",
		},
		"& p": {
			margin: "0px",
		},
		"& mjx-container": {
			padding: "2px !important",
		},
	}
});
