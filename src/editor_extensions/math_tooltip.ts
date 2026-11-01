import { type Tooltip, showTooltip, EditorView, ViewUpdate, tooltips, type Rect, type PluginValue, ViewPlugin } from "@codemirror/view";
import { StateField, EditorState, EditorSelection, StateEffect } from "@codemirror/state";
import { renderMath, finishRenderMath, editorLivePreviewField } from "obsidian";
import { type Bounds, Context, getContextPlugin } from "src/editor_context/context";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { syntaxTree } from "@codemirror/language";
import { cmDarkClass, cmLightClass, createElement } from "./obsidian_utils";
import { isBoundMultiline } from "src/utils/editor_utils";

type MathTooltip = {
	equation: string,
	bounds: Bounds,
	pos: number,
	tooltip: Tooltip,
}
const HIGHLIGHT_CLASS = "mjx-latex-suite-math-preview-highlight";
const CURSOR_CLASS = "mjx-latex-suite-cursor";
export const updateTooltipEffect = StateEffect.define<MathTooltip[]>();

function getParentDocumentCoords(view: EditorView, pos: number, above: boolean): Rect {
	const coords = view.coordsAtPos(pos);
	if (!coords) return view.dom.getBoundingClientRect();
	const frame = view.dom.win.frameElement as HTMLElement | null;
	if (!frame) return coords;

	const frameRect = frame.getBoundingClientRect();
	const scaleX = frame.clientWidth ? frameRect.width / frame.clientWidth : 1;
	const scaleY = frame.clientHeight ? frameRect.height / frame.clientHeight : 1;
	const frameLeft = frameRect.left + frame.clientLeft * scaleX;
	const frameTop = frameRect.top + frame.clientTop * scaleY;
	const frameBottom = frameRect.bottom - (frame.clientHeight - frame.clientTop - frame.clientHeight) * scaleY;
	// const coordTop = above ? Math.max(coords.top, 0) : coords.top < 0 ? frameRect.bottom : coords.top;
	const coordTop = Math.max(coords.top, 0) * scaleY;
	const coordBottom = Math.max(coords.bottom, 0) * scaleY;
	const top = frameTop + coordTop;
	const bottom = frameTop + coordBottom;

	const left = frameLeft + coords.left * scaleX;
	const right = frameLeft + coords.right * scaleX;
	// dont scroll down beyond the top and bottom of the frame goes to back top/bottom depending on above.
	if (above) {
		const above_top = coords.top < 0 || top > frameBottom ? frameTop : top;
		return {
			right,
			left,
			top: above_top,
			bottom: top,
		};
	} else {
		const below_top = coords.bottom < 0 || bottom > frameBottom ? frameBottom : bottom;
		return {
			right,
			left,
			top: below_top,
			bottom: below_top,
		}	
	}
}

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

class MathTooltipPlugin implements PluginValue {
	hasFocus: boolean;	
	prevFocus: boolean;
	constructor(view: EditorView) {
		this.prevFocus = view.hasFocus;
		this.hasFocus = view.hasFocus;
	}
	
	update(update: ViewUpdate) {
		this.prevFocus = this.hasFocus;
		this.hasFocus = update.view.hasFocus;
	}
}

const mathTooltipPlugin = ViewPlugin.fromClass(MathTooltipPlugin);

// update the tooltip by dispatching an updateTooltipEffect
export function handleMathTooltip(update: ViewUpdate) {
	const {prevFocus, hasFocus} = update.view.plugin(mathTooltipPlugin)!;
	const shouldUpdate = update.docChanged || update.selectionSet || (hasFocus !== prevFocus)
	if (!shouldUpdate) return;
	const settings = getLatexSuiteConfig(update.state);
	
	// We don't need to update the tooltip every time the cursor moves. 
	// Only update when we leaf or enter a LaTeX block. High impact.
	const ctx = getContextPlugin(update.view);
	const eqnBounds = shouldShowTooltip(update.state, ctx);

	if (!eqnBounds || (prevFocus && !hasFocus)) {
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
	let setPos: (pos: number) => void;
	// skip \{\} as thats not an argument to a macro
	const tempEscapedEqn = eqn.replaceAll(/\\[\\{}]/g, "\\R")
	const { left, right } = settings.mathPreviewBracketHighlighting && !ctx.mode.snippetlessEnv
		? findMatchingBrackets(tempEscapedEqn, eqnPos, "{", "}")
		: { left: -1, right: -1 };
	const mathPreviewCursor = !ctx.mode.snippetlessEnv && settings.mathPreviewCursor !== ""
		? ` \\class{${CURSOR_CLASS}}{}` + settings.mathPreviewCursor
		: "";

	if (right !== -1 && left !== -1) {
		const highlight_class_open = `\\class{${HIGHLIGHT_CLASS}}{`;
		// If the cursor is next to a bracket, move it inside the bracket pair
		// case when eqnPos === left
		const maxPosOrLeft = Math.max(left + 1, eqnPos);
		eqnWithDecorations =
			eqn.slice(0, left + 1) +
			highlight_class_open +
			eqn.slice(left + 1, maxPosOrLeft) +
			mathPreviewCursor +
			eqn.slice(maxPosOrLeft, right) +
			"}" +
			eqn.slice(right);
		setPos = (pos: number) => {
			let new_pos: number;
			if (pos <= left + 1) {
				new_pos = pos;
			} else if (pos <= maxPosOrLeft + highlight_class_open.length) {
				new_pos = Math.max(pos - highlight_class_open.length, left + 1);
			} else {
				new_pos = Math.max(pos - highlight_class_open.length - mathPreviewCursor.length, maxPosOrLeft);
			}
			update.view.focus()
			update.view.dispatch({
				selection: {
					head: new_pos + eqnBounds.inner_start,
					anchor: new_pos + eqnBounds.inner_start,
				}
			})
		}
	} else {
		eqnWithDecorations =
			eqn.slice(0, eqnPos) +
			mathPreviewCursor +
			eqn.slice(eqnPos);
		setPos = (pos: number) => {
			let new_pos: number;
			if (pos <= eqnPos) {
				new_pos = pos;
			} else if (pos < eqnPos + mathPreviewCursor.length) {
				new_pos = eqnPos;
			} else {
				new_pos = pos - mathPreviewCursor.length
			}
			const eqn_pos = new_pos + eqnBounds.inner_start;
			update.view.focus()
			update.view.dispatch({
				selection: {
					head: eqn_pos,
					anchor: eqn_pos,
				},
				scrollIntoView: true,
			})
		}
	}
	const oldTooltips = update.state.field(cursorTooltipField);
	// a little optimization: if the tooltip is currently shown and the equation with decorations is the same as the one in the tooltip, we don't need to update it.
	if (
		oldTooltips.length === 1 &&
		oldTooltips[0]!.equation === eqnWithDecorations &&
		oldTooltips[0]!.bounds.inner_start === eqnBounds.inner_start &&
		oldTooltips[0]!.bounds.inner_end === eqnBounds.inner_end
	) {
		return;
	}
	const isEqnMultiline = isBoundMultiline(update.view, eqnBounds);

	const above = settings.mathPreviewPositionIsAbove;
	const create: Tooltip["create"] = (view) => {
		const dom = createElement("div")
		dom.addClass("cm-tooltip-cursor");
		dom.addClass(above ? "cm-tooltip-above" : "cm-tooltip-below");
		// there is a plugin that can hide > in block math mode in the output.
		if (ctx.mode.blockMath) {
			// check if every newline is followed by the same amount of > as the line of the opening delimiters
			// if so hide them. A maximum  of 3 spaces can be at the beginning of the line before its not a block-quote.
			const blockQuoteCount = update.state.doc.lineAt(eqnBounds.inner_start).text.match(/^ {0,3}(>+)/)?.[1]!.length;
			if (blockQuoteCount) {
				const regex = new RegExp(`^ {0,3}>{${blockQuoteCount}}`, "gm");
				if (regex.test(eqn)) {
					eqnWithDecorations = eqnWithDecorations.replaceAll(regex, "");
				}
			}
		}
		let mount: ReturnType<Tooltip["create"]>["mount"] = () => {};
		try {
			const renderedEqn = renderMath(eqnWithDecorations, ctx.mode.inDisplayMath());
			createClickCallback(renderedEqn, eqnWithDecorations, setPos);
			const cursor = renderedEqn.querySelector<HTMLElement>(`.${CURSOR_CLASS}`)
			dom.appendChild(renderedEqn);
			mount = () =>
				window.requestAnimationFrame(() => {
					if (!cursor?.isConnected) return;
					const cRect = cursor.getBoundingClientRect();
					const rRect = renderedEqn.getBoundingClientRect();
					if (cRect.top > rRect.top  && cRect.bottom < rRect.bottom) return;
					const top =
						cRect.top - rRect.top - renderedEqn.clientHeight / 2;
					renderedEqn.scrollTop = top;
				});
			void finishRenderMath();
		} catch (e) {
			console.error("Error rendering math in tooltip:", e);
			dom.textContent = eqn
		}

		return {
			dom,
			mount,
			getCoords: (pos) => getParentDocumentCoords(view, pos, above),
		};
	};

	let newTooltips: Tooltip[] = [];

	if (isEqnMultiline) {
		newTooltips = [{
			pos: above ? eqnBounds.inner_start : eqnBounds.inner_end,
			above: above,
			strictSide: true,
			arrow: true,
			clip: false,
			create: create,
		}];
	} else if (!isEqnMultiline && above) {
		newTooltips = [{
			pos: eqnBounds.inner_start,
			above: true,
			strictSide: true,
			arrow: true,
			clip: false,
			create: create,
		}];
	} else if (!isEqnMultiline && !above) {
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
			clip: false,
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

function createClickCallback(renderedEqn: HTMLElement, eqnWithDecorations: string, setPos: (pos: number) => void) {
	function getLatexElement(element: HTMLElement): {element: HTMLElement, text: string} | null {
		const dataLatex = element.getAttribute("data-latex");
		if (dataLatex) {
			return { element, text: dataLatex };
		}
		const querySelector = element.querySelector<HTMLElement>("[data-latex]");
		if (querySelector) {
			const dataLatex = querySelector.getAttribute("data-latex")!;
			return { element: querySelector, text: dataLatex };
		}
		const textContent = element.textContent;
		for (let parent = element.parentElement; parent; parent = parent.parentElement) {
			const parentDataLatex = parent.getAttribute("data-latex");
			if (!parentDataLatex) continue;
			if (parentDataLatex.contains(textContent)) {
				return {element, text: parentDataLatex};
			} else {
				break;
			}
		}

		const closestLatex = element.closest<HTMLElement>("[data-latex]");
		if (closestLatex) {
			const closestDataLatex = closestLatex.getAttribute("data-latex")!;
			return {element: closestLatex, text: closestDataLatex};
		}
		return null;
			
	}
	// renderedEqn.addEventListener("mousedown");
	let previousHover: HTMLElement | null = null;
	const resetBackground = {
		"background-color": "",
	}
	const hoverBackground = {
		"background-color": "var(--text-selection)",
	}
	renderedEqn.addEventListener("mouseover", (event) => {
		if (previousHover !== null) {
			// previousHover.style.backgroundColor = "";
			previousHover.setCssProps(resetBackground);
		}
		const target = getLatexElement(event.target as HTMLElement)?.element;
		if (!target) return;
		previousHover = target;
		// target.style.backgroundColor = "var(--text-selection)";
		target.setCssProps(hoverBackground);
		target.addEventListener(
			"mouseleave",
			() => {
				target.setCssProps(resetBackground);
			},
			{ once: true },
		);
	});
	function getContainingLatexData(element: HTMLElement): string | null {
		const dataLatex = element.getAttribute("data-latex");
		if (dataLatex) return dataLatex;
		const childrenWithDataLatex = element.querySelectorAll<HTMLElement>("[data-latex]");
		const parentsSeen: HTMLElement[] = [];
		const dataLatexs: string[] = [];
		for (const child of childrenWithDataLatex) {
			if (parentsSeen.some((parent) => parent.contains(child))) continue;
			parentsSeen.push(child);
			const childDataLatex = child.getAttribute("data-latex")!;
			dataLatexs.push(childDataLatex);
		}
		return dataLatexs.length > 0 ? dataLatexs.join("") : null;
	}
	renderedEqn.addEventListener("mousedown", (event) => {
		const target = getLatexElement(event.target as HTMLElement);
		if (!target) return;
		const el = target.element;
		let identifier = target.text;
		const firstIdentifier = identifier;
		// pseudo code: eqnWithDecorations.indexOf(identifier) + identifier.length
		let occurrence = 1;
		for (let parentEl: HTMLElement | null = el; parentEl && renderedEqn.contains(parentEl); parentEl = parentEl.parentElement) {
			if (parentEl !== el) {
				const dataLatex = parentEl.getAttribute("data-latex");
				if (dataLatex) {
					const indexOf = stringIndexOfOccurrence(dataLatex, identifier, occurrence)
					if (indexOf === null) {
						console.error("Found parent element with data-latex, but the identifier is not found in DataLatex. identifier may not be present in the equation.", {identifier, occurrence, eqnWithDecorations, dataLatex});
					} else {
						identifier = dataLatex.slice(0, indexOf + identifier.length);						
						occurrence = 1;
					}
				}
			}
			for (let prevSibling = parentEl.previousElementSibling; prevSibling; prevSibling = prevSibling.previousElementSibling) {
				const dataLatex = getContainingLatexData(prevSibling as HTMLElement);
				if (!dataLatex) continue;
				occurrence += dataLatex.split(identifier).length - 1;
			}
		}
		const index = stringIndexOfOccurrence(eqnWithDecorations, identifier, occurrence);
		if (index === null) {
			console.error("Could not find identifier in eqnWithDecorations", {identifier, occurrence, eqnWithDecorations});
			return;
		}
		const side = event.clientX < el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2 ? "left" : "right";
		const pos = index + identifier.length - (side === "left" ? firstIdentifier.length : 0);
		window.setTimeout(() => {
			setPos(pos);
		}, 10)
	});
}

function stringIndexOfWithFilter(str: string, subStr: string, filter: (char: string) => boolean, position?: number): number | null {
	for (let j = position ?? 0; j < str.length; j++) {
		let temp_j = j;
		for (let i = 0; i < subStr.length && temp_j < str.length; i++) {
			if (str[temp_j] === subStr[i]) {
				temp_j++;
				if (i === subStr.length - 1) return temp_j - subStr.length;
			} else if (filter(str[temp_j]!)) {
				temp_j++;
				i--;
			} else if (filter(subStr[i]!)) {
				continue;
			} else {
				break;
			}
		}
	}
	return null;
}
// console.log(stringIndexOfWithFilter("\\lim\\limits_1", "\\limits", (char) => /s/.test(char)))
// console.log(stringIndexOfWithFilter("\\lim\\limits_{n \\to \\infty}", "\\limits_{n\\t", (char) => /s/.test(char)))

function stringIndexOfOccurrence(str: string, subStr: string, occurrence: number): number | null {
	let index = -1;
	for (let i = 0; i < occurrence; i++) {
		const nextIndex = stringIndexOfWithFilter(
			str,
			subStr,
			(char) => /\s/.test(char),
			index + 1,
		);
		if (nextIndex === null) return null;
		index = nextIndex;
	}
	return index;
}

function shouldShowTooltip(state: EditorState, ctx: Context): Bounds | null {
	if (!ctx.mode.inMath()) return null;
	const settings = getLatexSuiteConfig(state);
	const isLivePreview = state.field(editorLivePreviewField);
	if (ctx.mode.blockMath && isLivePreview && !settings.mathPreviewLivePreviewDisplay) return null;

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
		fontSize: "var(--font-preferred-size)",
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
		
		// CM6 puts the top of the tooltip higher than what's viewable (negative top value),
		// so to compensate for this, we align the content to the bottom of the tooltip container,
		// and limit the height.
		"&.cm-tooltip-above": {
			display: "flex",
		},
		"&.cm-tooltip-above > .MathJax": {
			overflowY: "auto",
			scrollbarWidth: "none",
			// maxHeight: "80%",
			// display: "inline-block",
			// alignSelf: "flex-end",
		},
		"&.cm-tooltip-below > .MathJax": {
			overflowY: "auto",
			maxHeight: "90%",
			scrollbarWidth: "none",
		},
	},
	[`.${HIGHLIGHT_CLASS}`]: {
		backgroundColor: "var(--text-selection)",
	},
	[`${cmDarkClass} .cm-tooltip.cm-tooltip-cursor`]: {
		boxShadow: "0 1px 2px rgb(0 0 0 / 10%), 0 3.4px 6.7px rgb(0 0 0 / 15%), 0 0 30px rgb(0 0 0 / 27%)"
	},
	[`${cmLightClass} .cm-tooltip.cm-tooltip-cursor`]: {
		boxShadow: "0 1px 2px rgb(0 0 0 / 2.8%), 0 3.4px 6.7px rgb(0 0 0 / 4.2%), 0 5px 20px rgb(0 0 0 / 7%)",
	},
});


const tooltipSpaceExtension = tooltips({
	position: "absolute",
	tooltipSpace() {
		const body = activeDocument.body
		const bodyRect = body.getBoundingClientRect();
		return {
			bottom: bodyRect.bottom,
			left: bodyRect.left,
			right: bodyRect.right,
			top: bodyRect.top,
		}
	},
	parent: activeDocument.body,
})


export const mathTooltipExtension = [
	cursorTooltipField.extension,
	cursorTooltipBaseTheme,
	tooltipSpaceExtension,
	mathTooltipPlugin
]
