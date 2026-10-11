import { beforeAll, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { RawSnippet } from "./main";

async function setTestDoc<T extends ContextId<unknown>>(contextId: T) {
	await evalInObsidian({
		contextId,
		callback: async ({ app, obsidianModule, lib }) => {
			const file =
				app.vault.getFileByPath("test.md") ??
				(await lib.createNote({
					path: "test.md",
					content: "",
				}));
			const leaf = app.workspace.getLeaf(false);
			await leaf.openFile(file);
			if (
				window.__latex_suite_test_library.view?.state.field(
					obsidianModule.editorLivePreviewField,
				)
			) {
				app.commands.executeCommandById("editor:toggle-source");
			}
			await lib.plugin.saveSettings();
		},
	});
}


describe("mathless args", async () => {
	registerLibResolver(() => window.__latex_suite_test_library)
	getTemporaryVault();
	beforeAll(async () => {
		const contextId = new ContextId<void>()
		await setTestDoc(contextId);
	});
	registerLibResolver(() => window.__latex_suite_test_library)
	it("should by default skip operatorname", async () => {
		const snippet: RawSnippet = {trigger: "1", replacement: "", options: "mA"};
		const equation = "$$\\operatorname{arg}$$";
		const position = "$$\\operatorname{arg}".length;
		const setDocArg = [equation, position] as const;
		const result = await evalInObsidian({
			input: {snippet, setDocArg},
			callback: async ({lib, snippet, setDocArg}) => {
				const { view, pressKey, plugin } = lib;
				plugin.settings.textMacros = plugin.test.DEFAULT_SETTINGS.textMacros;
				plugin.settings.snippets = `export default [${JSON.stringify(snippet)}]`;
				plugin.settings.loadSnippetsFromFile = false;
				await plugin.saveSettings(true, true);
				view.setDoc(...setDocArg);
				pressKey({ key: "1" });
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString();
			}
		})
		expect(result).toBe(setDocArg[0]);
	})
})
