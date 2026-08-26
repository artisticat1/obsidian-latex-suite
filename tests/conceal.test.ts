import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import TestPlugin  from "./main";
import { TFile } from "obsidian";

interface FileContext {
	file: TFile
}

describe("conceal", async () => {
	const vault = getTemporaryVault();
	const contextId = new ContextId<FileContext>()
	registerLibResolver(() => window.__latex_suite_test_library)
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
			lib.plugin.settings.concealEnabled = true;	
			lib.plugin.saveSettings();
	    }
	});
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
				const basic_output = conceal(view, {})
				view.dispatch({
					changes: {from: 0, to: view.state.doc.length, insert: callout_display}
				})
				const callout_output = conceal(view, {})
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
				const equation_result = conceal(view, {}).cached_equations
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
});
