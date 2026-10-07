import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { TFile } from "obsidian";

interface FileContext {
	file: TFile
}

async function createContextId<R extends FileContext, T extends ContextId<R>>(contextId: T) {
	await evalInObsidian({
	    contextId,
	    callback: async ({ app, context, obsidianModule, lib }) => {
			context.file =
				app.vault.getFileByPath("test.md") ??
				await app.vault.create("test.md", "");
			const leaf = app.workspace.getLeaf(false)
			await leaf.openFile(context.file)
			if (window.__latex_suite_test_library.view?.state.field(obsidianModule.editorLivePreviewField)) {
				app.commands.executeCommandById("editor:toggle-source");
			}
			console.log(lib.plugin.settings)
			lib.plugin.settings.concealEnabled = true;	
			lib.plugin.saveSettings();
	    }
	});
}

describe("conceal", async () => {
	getTemporaryVault();
	const contextId = new ContextId<FileContext>()
	beforeAll(async () => {
		registerLibResolver(() => window.__latex_suite_test_library)
		await createContextId(contextId)
		registerLibResolver(() => window.__latex_suite_test_library)
	})
	beforeEach(() => {
		registerLibResolver(() => window.__latex_suite_test_library)
	})
	it("Simple einstein equation", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib }) => {
				const plugin = lib.plugin
				const view = lib.view
				const conceal = plugin.test.conceal
				// set content to "Einstein's equation is $E=mc^2$."
				const basic_display =
`
$$
E = mc^2
$$
`
				const callout_display =
`
> [!note] info callout
> $$
> E = mc^{2}
> $$
`
				view.dispatch({
					changes: {from: 0, to: view.state.doc.length, insert: basic_display}
				})
				const basic_output = conceal(view)
				view.dispatch({
					changes: {from: 0, to: view.state.doc.length, insert: callout_display}
				})
				const callout_output = conceal(view)
				return [basic_output, callout_output]
			}
		})
		expect(result[0].cached_equations).toStrictEqual({
			"E = mc^2": [
				[{"start": 6, "end": 8, "text": "2", "class": "cm-number", "elementType": "sup"}]
			]
		})
		expect(result[1].cached_equations).toStrictEqual({
			"E = mc^{2}": [
				[{"start": 6, "end": 10, "text": "2", "class": "cm-number", "elementType": "sup"}]
			]
		})
	})
	
	it("multiline equation", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib }) => {
				const plugin = lib.plugin
				const view = lib.view
				const conceal = plugin.test.conceal
				const equation = 
`
$$
X_{1}
X_{2}
$$
`
				view.setDoc(equation)
				const equation_result = conceal(view).cached_equations
				return [equation_result]
			}
		})
		result.forEach((equation_result) => {
			expect(equation_result).toStrictEqual({
				"X_{1}": [
					[{"start": 1, "end": 5, "text": "1", "class": "cm-number", "elementType": "sub"}]
				],
				"X_{2}": [
					[{"start": 1, "end": 5, "text": "2", "class": "cm-number", "elementType": "sub"}]
				]
			});
		})
	})
	
	it("malformed multiline equation", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib }) => {
				const plugin = lib.plugin
				const view = lib.view
				const conceal = plugin.test.conceal
				const start_end_equation = 
`
$$X_1
X_2
X_3$$
`
				view.setDoc(start_end_equation)
				const equation_result = conceal(view).cached_equations
				return equation_result
			}
		})
		expect(result).toStrictEqual({
			"X_1": [
				[{"start": 1, "end": 3, "text": "1", "class": "cm-number", "elementType": "sub"}]
			],
			"X_2": [
				[{"start": 1, "end": 3, "text": "2", "class": "cm-number", "elementType": "sub"}]
			],
			"X_3": [
				[{"start": 1, "end": 3, "text": "3", "class": "cm-number", "elementType": "sub"}]
			]
		})
	})
	
	it("should conceal subscript after parenthesis", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib: {plugin, view} }) => {
				const conceal = plugin.test.conceal
				const equation = 
`
$$
(x)^{2}
$$
`
				view.setDoc(equation)
				const equation_result = conceal(view).cached_equations
				return equation_result
			}
		})
		expect(result).toStrictEqual({
			"(x)^{2}": [
				[
					{
						class: "cm-number",
						elementType: "sup",
						end: 7,
						start: 3,
						text: "2",
					},
				],
			],
		});
	})
	it("should only subscript the first character (#666)", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib: {plugin, view} }) => {
				const conceal = plugin.test.conceal
				const equation = 
`
$$
A_bCD⊗EFG
$$
`
				view.setDoc(equation)
				const equation_result = conceal(view).cached_equations
				return equation_result
			}
		})
		expect(result).toStrictEqual({
			"A_bCD⊗EFG": [
				[
					{
						class: "cm-number",
						elementType: "sub",
						end: 3,
						start: 1,
						text: "b",
					},
				],
			],
		});
	})
	it("should only subscript the first number (#666)", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib: {plugin, view} }) => {
				const conceal = plugin.test.conceal
				const equation = 
`
$$
A_1234
$$
`
				view.setDoc(equation)
				const equation_result = conceal(view).cached_equations
				return equation_result
			}
		})
		expect(result).toStrictEqual({
			A_1234: [
				[
					{
						class: "cm-number",
						elementType: "sub",
						end: 3,
						start: 1,
						text: "1",
					},
				],
			],
		});
	})
	
	it("should subscript \\left and \\right", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib: {plugin, view} }) => {
				const conceal = plugin.test.conceal
				const equation = 
`
$$
A_\\left(1\\alpha 234\\right)
$$
`
				view.setDoc(equation)
				const equation_result = conceal(view).cached_equations
				return equation_result
			}
		})
		expect(result).toStrictEqual({
			"A_\\left(1\\alpha 234\\right)": [
				[
					{
						class: "cm-number",
						elementType: "sub",
						end: 26,
						start: 1,
						text: "\\left(1α 234\\right)",
					},
				],
				[],
				[
					{
						end: 15,
						start: 9,
						text: "α",
					},
				],
				[],
			],
		});
	})

	it("should subscript A_a\u0304 a full grapheme cluster", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib: {plugin, view} }) => {
				const conceal = plugin.test.conceal
				const equation = 
`
$$
A_a\u0304
$$
`
				view.setDoc(equation)
				const equation_result = conceal(view).cached_equations
				return equation_result
			}
		})
		expect(result).toStrictEqual({
			"A_a\u0304": [
				[
					{
						class: "cm-number",
						elementType: "sub",
						end: 4,
						start: 1,
						text: "a\u0304",
					},
				],
			],
		});
	})
	it("should subscript stop in a reasonable time for a long equation when the parser is not done yet.", async () => {
		const inside_equation = "a_{\\alpha\\epsilon\\omega\\omega\\omega \\omega }".repeat(100)
		const equation = "${}" + inside_equation + "{}$"
		// explicitly not testing the output as the parser may finish at different points in time due to cpu load, ram load, etc.
		// main point is that it doesn't timeout.
		await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite", equation},
			contextId,
			callback: async ({app, pluginId, obsidianModule, lib: {plugin}, equation, context}) => {
				const conceal = plugin.test.conceal
				// have to create it this way, as view.setDoc will make the parser parse the full equation as it parses the whole viewport synchronous.
				const view = plugin.createNormalView(equation);
				conceal(view).cached_equations
			},
		})
	})
})
