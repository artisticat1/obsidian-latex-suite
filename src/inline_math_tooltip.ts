import {Tooltip, showTooltip, EditorView} from "@codemirror/view"
import {StateField, EditorState} from "@codemirror/state"
import { getEquationBounds, isWithinEquation, isWithinInlineEquationState } from "./editor_helpers";
import { MarkdownRenderer } from "obsidian";

export const cursorTooltipField = StateField.define<readonly Tooltip[]>({
	create: getCursorTooltips,

	update(tooltips, tr) {
		if (!tr.docChanged && !tr.selection) return tooltips;
		return getCursorTooltips(tr.state);
	},

	provide: f => showTooltip.computeN([f], state => state.field(f))
});



function getCursorTooltips(state: EditorState): readonly Tooltip[] {

    if (isWithinEquation(state) && isWithinInlineEquationState(state)) {
        const bounds = getEquationBounds(state);
        if (!bounds) return [];

        // Don't render an empty equation
        if (bounds.start === bounds.end) return [];

        const eqn = state.sliceDoc(bounds.start, bounds.end);

        return [
			{
				pos: bounds.start,
				above: true,
				strictSide: true,
				arrow: true,
				create: () => {
					let dom = document.createElement("div");
					dom.className = "cm-tooltip-cursor";
					MarkdownRenderer.renderMarkdown("$" + eqn + "$", dom, "", null);

					return { dom };
				}
			}
		];
    }
    else {
        return [];
    }
}


export const cursorTooltipBaseTheme = EditorView.baseTheme(
	{
		".cm-tooltip.cm-tooltip-cursor": {
			backgroundColor: "var(--background-primary)",
			color: "var(--text-normal)",
			border: "1px solid var(--background-modifier-border)",
			padding: "2px 7px",
			borderRadius: "6px",
			"& .cm-tooltip-arrow:before": {
				borderTopColor: "var(--background-modifier-border)"
			},
			"& .cm-tooltip-arrow:after": {
				borderTopColor: "var(--background-primary)"
			},
			"& p": {
				marginTop: "2px",
				marginBottom: "2px"
			}
    	}
	}
);