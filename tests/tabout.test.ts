
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
			await lib.plugin.saveSettings();
	    }
	});
	registerLibResolver(() => window.__latex_suite_test_library)
	
	it("should exit brackets for $()$", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$()$", "$(".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.selection.main.head;
			}
		})
		expect(result).toBe("$()".length)
	})

	it("should exit for `$E_{filler}=mc^2$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$E_{filler}=mc^2$", "$E_{filler}=mc^2".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.selection.main.head;
			}
		})
		expect(result).toBe("$E_{filler}=mc^2$".length)
	})
	it("should not exit for `$E_{filler}=mc^2$` in the middle", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$E_{filler}=mc^2$", "$E_{filler}".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("	$E_{filler}=mc^2$")
	})
	it("should exit for `$$E_{filler}=mc^2$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$E_{filler}=mc^2$$", "$$E_{filler}=mc^2".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.selection.main.head;
			}
		})
		expect(result).toBe("$$E_{filler}=mc^2$$".length)
	})
	
	it("should skip unbalanced brackets for `$$1_{[0,1)}$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$1_{[0,1)}$$", "$$1_{[0,1}".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.selection.main.head;
			}
		})
		expect(result).toBe("$$1_{[0,1)}".length)
	})
	
	it("should go to right command for `$$\\left| \\right.$$", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\left| \\right.$$", "$$\\left| ".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.selection.main.head;
			}
		})
		expect(result).toBe("$$\\left| \\right.".length)
	})
	

	it("should go to right command for `$$ \\right.$$", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$ \\right.$$", "$$ ".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.selection.main.head;
			}
		})
		expect(result).toBe("$$ \\right.".length)
	})
	
	it("should tabout inside a matrix for `$$\\begin{matrix}\n\\text{test}\n\\end{matrix}$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\begin{matrix}\n\\text{test}\n\\end{matrix}$$", "$$\\begin{matrix}\n\\text{test".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.selection.main.head;
			}
		})
		expect(result).toBe("$$\\begin{matrix}\n\\text{test}".length)
	})
})
