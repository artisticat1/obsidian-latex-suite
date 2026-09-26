import { describe, expect, it } from "vitest";
import { evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";


describe("autodelete $ in inline math", async () => {
	registerLibResolver(() => window.__latex_suite_test_library)
	getTemporaryVault();
	await evalInObsidian({
	    callback: async ({ app, context, obsidianModule, lib }) => {
			const file = app.vault.getFileByPath("test.md") ??
				await lib.createNote({
					path: "test.md",
					content: "",
				});
			const leaf = app.workspace.getLeaf(false)
			await leaf.openFile(file)
			if (window.__latex_suite_test_library.view?.state.field(obsidianModule.editorLivePreviewField)) {
				app.commands.executeCommandById("editor:toggle-source");
			}
			lib.plugin.saveSettings();
	    }
	});
	
	it("should delete both $ for `$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$", "$".length)
				pressKey({
					key: "Backspace"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("")
	})

	it("should delete both $ and {} for `${}{}$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("${}{}$", "${}".length)
				pressKey({
					key: "Backspace"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("")
	})
	
	it("should delete both $ for `some *text* $$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("some *text* $$", "some *text* $".length)
				pressKey({
					key: "Backspace"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("some *text* ")
	})
})
