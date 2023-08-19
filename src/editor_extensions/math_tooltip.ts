import { Tooltip, showTooltip, EditorView } from "@codemirror/view";
import { StateField, EditorState } from "@codemirror/state";
import { getEquationBounds, isWithinEquation, isWithinInlineEquation } from "../editor_helpers";
import { renderMath, finishRenderMath, editorLivePreviewField } from "obsidian";

export const cursorTooltipField = StateField.define<readonly Tooltip[]>({
	create: getCursorTooltips,

	update(tooltips, tr) {
		if (!tr.docChanged && !tr.selection) return tooltips;
		return getCursorTooltips(tr.state);
	},

	provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
});

function getCursorTooltips(state: EditorState): readonly Tooltip[] {
	const pos = state.selection.main.from;

	if (!isWithinEquation(state)) {
		return [];
	}

	const isInline = isWithinInlineEquation(state, pos)
	const isLivePreview = state.field(editorLivePreviewField);
	if (!isInline && isLivePreview) return [];

	const bounds = getEquationBounds(state, pos);
	if (!bounds) return [];

	const eqn = state.sliceDoc(bounds.start, bounds.end);

	// Don't render an empty equation
	if (eqn.trim() === "") return [];

	return [
		{
			pos: bounds.start,
			above: true,
			strictSide: true,
			arrow: true,
			create: () => {
				const dom = document.createElement("div");
				dom.className = "cm-tooltip-cursor";

				const renderedEqn = renderMath(eqn, !isInline);
				dom.appendChild(renderedEqn);
				finishRenderMath();

				return { dom };
			}
		}
	];

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
		},
		"& .cm-tooltip-arrow:after": {
			borderTopColor: "var(--background-secondary)",
		},
		"& p": {
			margin: "0px",
		},
		"& mjx-container": {
			padding: "2px !important",
		},
	}
});
