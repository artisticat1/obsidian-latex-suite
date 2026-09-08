import { beforeEach, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { TFile } from "obsidian";

interface FileContext {
	file: TFile
}

describe("conceal", async () => {
	getTemporaryVault();
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
	it("should display mismatched brackets", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib }) => {
				const plugin = lib.plugin
				const view = lib.view
				const color = plugin.test.colorPairedBrackets
				// set content to "Einstein's equation is $E=mc^2$."
				const basic_display =
`
$$
\\frac{1}{2
$$
`
				view.setDoc(basic_display)
				const basic_output = color(view, {}).cached_equations
				return basic_output;
				
			}
		})
		expect(result).toMatchSnapshot();
	})
})
