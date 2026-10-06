import { describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { EditorView } from "@codemirror/view";


interface Context {
	view: EditorView;
}

describe("conceal excalidraw", async () => {
	registerLibResolver(() => window.__latex_suite_test_library)
	const contextId = new ContextId<Context>()
	getTemporaryVault();
	await evalInObsidian({
		contextId,
	    callback: async ({ context, lib }) => {
			context.view = lib.plugin.createExcalidrawView();
	    }
	});
	it("Simple einstein equation", async () => {
		const result = await evalInObsidian({
			input: { pluginId: "obsidian-latex-suite" },
			contextId,
			callback: ({ lib, context }) => {
				const plugin = lib.plugin;
				const view = context.view;
				const conceal = plugin.test.conceal;
				// set content to "Einstein's equation is $E=mc^2$."
				const basic_display = `E = mc^2`;
				view.dispatch({
					changes: {
						from: 0,
						to: view.state.doc.length,
						insert: basic_display,
					},
				});
				const basic_output = conceal(view);
				return basic_output
			},
		});
		expect(result.cached_equations).toStrictEqual({
			"E = mc^2": [
				[
					{
						start: 6,
						end: 8,
						text: "2",
						class: "cm-number",
						elementType: "sup",
					},
				],
			],
		});
	});

	it("multiline equation", async () => {
		const result = await evalInObsidian({
			input: { pluginId: "obsidian-latex-suite" },
			contextId,
			callback: ({ lib, context }) => {
				const plugin = lib.plugin;
				const view = context.view;
				const conceal = plugin.test.conceal;
				const equation = `
X_{1}
X_{2}
`;
				view.setDoc(equation);
				const equation_result = conceal(view).cached_equations;
				return [equation_result];
			},
		});
		result.forEach((equation_result) => {
			expect(equation_result).toStrictEqual({
				"X_{1}": [
					[
						{
							start: 1,
							end: 5,
							text: "1",
							class: "cm-number",
							elementType: "sub",
						},
					],
				],
				"X_{2}": [
					[
						{
							start: 1,
							end: 5,
							text: "2",
							class: "cm-number",
							elementType: "sub",
						},
					],
				],
			});
		});
	});

	it("malformed multiline equation", async () => {
		const result = await evalInObsidian({
			contextId,
			input: { pluginId: "obsidian-latex-suite" },
			callback: ({ lib, context }) => {
				const plugin = lib.plugin;
				const view = context.view;
				const conceal = plugin.test.conceal;
				const start_end_equation = `
X_1
X_2
X_3
`;
				view.setDoc(start_end_equation);
				const equation_result = conceal(view).cached_equations;
				return equation_result;
			},
		});
		expect(result).toStrictEqual({
			X_1: [
				[
					{
						start: 1,
						end: 3,
						text: "1",
						class: "cm-number",
						elementType: "sub",
					},
				],
			],
			X_2: [
				[
					{
						start: 1,
						end: 3,
						text: "2",
						class: "cm-number",
						elementType: "sub",
					},
				],
			],
			X_3: [
				[
					{
						start: 1,
						end: 3,
						text: "3",
						class: "cm-number",
						elementType: "sub",
					},
				],
			],
		});
	});

	it("should conceal subscript after parenthesis", async () => {
		const result = await evalInObsidian({
			contextId,
			input: { pluginId: "obsidian-latex-suite" },
			callback: ({
				lib: { plugin}, context: { view }
			}) => {
				const conceal = plugin.test.conceal;
				const equation = `(x)^{2}`;
				view.setDoc(equation);
				const equation_result = conceal(view).cached_equations;
				return equation_result;
			},
		});
		expect(result).toMatchInlineSnapshot(`
{
  "(x)^{2}": [
    [
      {
        "class": "cm-number",
        "elementType": "sup",
        "end": 7,
        "start": 3,
        "text": "2",
      },
    ],
  ],
}
`);
	});
	
	it("should be math for empty equation", async () => {
		const result = await evalInObsidian({
			contextId,
			input: { pluginId: "obsidian-latex-suite" },
			callback: ({
				lib: { plugin}, context: { view }
			}) => {
				const equation = ``;
				view.setDoc(equation);
				const ctx = plugin.test.getContextPlugin(view);
				return ctx.mode.blockMath;
			},
		});
		expect(result).toBe(true);
	})

})
