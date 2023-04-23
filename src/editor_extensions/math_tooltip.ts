import { Tooltip, showTooltip, EditorView } from "@codemirror/view";
import { StateField, EditorState } from "@codemirror/state";
import {
	getEquationBounds,
	isWithinEquation,
	isWithinInlineEquation,
} from "../editor_helpers";
import { MarkdownRenderer, editorLivePreviewField } from "obsidian";

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

	if (isWithinEquation(state)) {
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
					const delimiter = isInline ? "$" : "$$";
					const dom = document.createElement("div");
					dom.className = "cm-tooltip-cursor";
					MarkdownRenderer.renderMarkdown(
						delimiter + eqn + delimiter,
						dom,
						"",
						null
					);

					return { dom };
				},
			},
		];
	} else {
		return [];
	}
}

export const cursorTooltipBaseTheme = EditorView.baseTheme({
	".cm-tooltip.cm-tooltip-cursor": {
		backgroundColor: "var(--background-primary)",
		color: "var(--text-normal)",
		border: "1px solid var(--background-modifier-border)",
		padding: "4px 6px",
		borderRadius: "6px",
		"& .cm-tooltip-arrow:before": {
			borderTopColor: "var(--background-modifier-border)",
		},
		"& .cm-tooltip-arrow:after": {
			borderTopColor: "var(--background-primary)",
		},
		"& p": {
			margin: "0px",
		},
		"& mjx-container": {
			padding: "2px !important",
		},
	},
});
