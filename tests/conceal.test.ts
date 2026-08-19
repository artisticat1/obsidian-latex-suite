/// <reference types="obsidian-typings" />
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import TestPlugin  from "./main";
import { TFile } from "obsidian";

interface FileContext {
	file: TFile
}

describe("conceal", () => {
	const vault = getTemporaryVault();
	const contextId = new ContextId<FileContext>()
	beforeAll(async () => {
  await evalInObsidian({
	    contextId,
	    callback: async ({ app, context }) => {
			context.file =
				app.vault.getFileByPath("test.md") ??
				await app.vault.create("test.md", "");
		const leaf = app.workspace.getLeaf(false)
		await leaf.openFile(context.file)
	    }
  });
	});
	it("Simple einstein equation", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule }) => {
				const plugin = app.plugins.getPlugin(pluginId) as TestPlugin | null
				if (!plugin) throw new Error("plugin not enabled")
				const conceal = plugin.test.conceal
				// set content to "Einstein's equation is $E=mc^2$."
				const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView)?.editor?.activeCM
				if (!view) throw new Error("No active view")
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
});
