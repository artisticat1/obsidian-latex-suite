import { Tooltip, showTooltip, EditorView, ViewUpdate } from "@codemirror/view";
import { StateField, EditorState, EditorSelection, StateEffect } from "@codemirror/state";
import { renderMath, finishRenderMath, editorLivePreviewField } from "obsidian";
import { Context } from "src/utils/context";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { syntaxTree } from "@codemirror/language";

const updateTooltipEffect = StateEffect.define<Tooltip[]>();

export const cursorTooltipField = StateField.define<readonly Tooltip[]>({
	create: () => [],

	update(tooltips, tr) {
		for (const effect of tr.effects) {
			if (effect.is(updateTooltipEffect)) return effect.value;
		}

		return tooltips;
	},

	provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
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

	const left = aux(text, cursorPos, closeBracket, openBracket, -1);
	const right = aux(text, cursorPos, openBracket, closeBracket, 1);
	return { left, right };
}

// update the tooltip by dispatching an updateTooltipEffect
export function handleMathTooltip(update: ViewUpdate) {
	const shouldUpdate = update.docChanged || update.selectionSet;
	if (!shouldUpdate) return;

	const settings = getLatexSuiteConfig(update.state);
	const ctx = Context.fromState(update.state);

	if (!shouldShowTooltip(update.state, ctx)) {
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

	// HACK: eqnBounds is not null because shouldShowTooltip was true
	const eqnBounds = ctx.getBounds();
	const eqn = update.state.sliceDoc(eqnBounds.start, eqnBounds.end);
	const pos = update.state.selection.main.head;
	let cursorPos = update.state.selection.main.head - eqnBounds.start;
	// const eqnWithCursor = eqn.slice(0, cursorPos) + "▶" + eqn.slice(cursorPos);
	let eqnWithDecorations: string;
	const {left, right} = findMatchingBrackets(eqn, cursorPos, "{", "}");
	const results: string[] = [`current cursor pos in equation: ${cursorPos}`, "AST:"];
	syntaxTree(update.state).iterate({
		enter: (node) => {
			if (node.from >= eqnBounds.start && node.to <= eqnBounds.end) {
				results.push(`${node.name} [${node.from - eqnBounds.start}, ${node.to - eqnBounds.start})`);
				if (
					node.name === "math_tag" &&
					node.from < pos &&
					node.to >= pos
				) {
					cursorPos = node.from - eqnBounds.start;
					console.log(
						`adjusted cursor pos in equation: ${cursorPos}`
					);
				}
			}
			return true;
		},
		from: eqnBounds.start,
		to: eqnBounds.end,
	});
	results.push(`adjusted cursor pos in equation: ${cursorPos}`);
	console.log(results.join("\n"));
	if (right !== -1 && left !== -1) {
		// If the cursor is next to a bracket, move it inside the bracket pair
		const middleText = left + 1 > cursorPos ? "" :eqn.slice(left + 1, cursorPos)
		const endText = left + 1 > cursorPos ? eqn.slice(left+1): eqn.slice(cursorPos);
		console.log({left: left+1, cursorPos, })
		eqnWithDecorations = eqn.slice(0, left + 1) + "\\color[RGB]{8, 38, 249} " + middleText + "▶" + endText
		console.log({left, right, eqnWithDecorations});
	} else {
		eqnWithDecorations = eqn.slice(0, cursorPos) + "▶" + eqn.slice(cursorPos);
	}

	const above = settings.mathPreviewPositionIsAbove;
	const create = () => {
		const dom = document.createElement("div");
		dom.addClass("cm-tooltip-cursor");

		const renderedEqn = renderMath(eqnWithDecorations, ctx.mode.blockMath || ctx.mode.codeMath);
		dom.appendChild(renderedEqn);
		finishRenderMath();
		renderedEqn.querySelectorAll('[style*="rgb(8, 38, 249)"]').forEach(el => {
			if (el.style.color === "rgb(8, 38, 249)") {
				el.style.color = "";
				el.classList.add("cm-selectionBackground");
				// el.style.fontWeight = "bold";
			}
		});
		// console.log(renderedEqn)

		return { dom };
	};

	let newTooltips: Tooltip[] = [];

	if (ctx.mode.blockMath || ctx.mode.codeMath) {
		newTooltips = [{
			pos: above ? eqnBounds.start : eqnBounds.end,
			above: above,
			strictSide: true,
			arrow: true,
			create: create,
		}];
	} else if (ctx.mode.inlineMath && above) {
		newTooltips = [{
			pos: eqnBounds.start,
			above: true,
			strictSide: true,
			arrow: true,
			create: create,
		}];
	} else if (ctx.mode.inlineMath && !above) {
		const endRange = EditorSelection.range(eqnBounds.end, eqnBounds.end);

		newTooltips = [{
			pos: Math.max(
				eqnBounds.start,
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
		effects: [updateTooltipEffect.of(newTooltips)]
	});
}

function shouldShowTooltip(state: EditorState, ctx: Context): boolean {
	if (!ctx.mode.inMath()) return false;

	const isLivePreview = state.field(editorLivePreviewField);
	if (ctx.mode.blockMath && isLivePreview) return false;

	// FIXME: eqnBounds can be null
	const eqnBounds = ctx.getBounds();
	if (!eqnBounds) return false;

	// Don't render an empty equation
	const eqn = state.sliceDoc(eqnBounds.start, eqnBounds.end).trim();
	if (eqn === "") return false;

	return true;
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
