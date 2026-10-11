import { describe, expect, it } from "vitest";
import { evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { RawSnippet } from "./main";

// needs to be json transformable, so no functions and direct regex.
const snippets = [
	{trigger: "sum", replacement: "\\sum", options: "mA"},
	{trigger: "int", replacement: "\\int", options: "mA"},
	{trigger: "rum", replacement: "\\rum", options: "mA"}
] satisfies RawSnippet[];



describe("auto enlarge brackets in snippets", async () => {
	registerLibResolver(() => window.__latex_suite_test_library)
	getTemporaryVault();
	await evalInObsidian({
		input: {snippets},
	    callback: async ({ app, context, obsidianModule, lib: {
			createNote, plugin
		}, snippets }) => {
			const file = app.vault.getFileByPath("test.md") ??
				await createNote({
					path: "test.md",
					content: "",
				});
			const leaf = app.workspace.getLeaf(false)
			await leaf.openFile(file)
			if (window.__latex_suite_test_library.view?.state.field(obsidianModule.editorLivePreviewField)) {
				app.commands.executeCommandById("editor:toggle-source");
			}
			const settings = plugin.settings
			settings.snippets = `export default ${JSON.stringify(snippets)}`
			settings.loadSnippetsFromFile = false;
			settings.snippetsEnabled = true;
			settings.autoEnlargeBrackets = true;
			settings.autoEnlargeBracketsSpace = true;
			settings.autoEnlargeBracketsTriggers = "sum,int"
			await plugin.saveSettings(true, false);
			plugin.setLib()
	    }
	});
	registerLibResolver(() => window.__latex_suite_test_library)
	
	it("should enlarge brackets for sum", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$(su)$$", "$$(su".length)
				pressKey({ key: "m" })
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("$$\\left( \\sum \\right)$$")
	})

	it("should not enlarge brackets for rum", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$(\\sum ru)$$", "$$(\\sum ru".length)
				pressKey({ key: "m" })
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("$$(\\sum \\rum)$$")
	})

	it("should only enlarge brackets containing the trigger", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$((a+b)su)$$", "$$((a+b)su".length)
				pressKey({ key: "m" })
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("$$\\left( (a+b)\\sum \\right)$$")
	})

	it("should enlarge brackets for int", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$(in)$$", "$$(in".length)
				pressKey({ key: "t" })
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("$$\\left( \\int \\right)$$")
	})
	
	it("should not enlarge brackets with a modifier", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\left( \\big(in) ) \\right.$$", "$$\\left( \\big(in".length)
				pressKey({ key: "t" })
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("$$\\left( \\big(\\int) ) \\right.$$")
	})
	
	it("should not add a space for space off", async () => { 
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey, plugin } = lib;
				plugin.settings.autoEnlargeBracketsSpace = false;
				await plugin.saveSettings();
				view.setDoc("$$(su)$$", "$$(su".length)
				pressKey({ key: "m" })
				await new Promise(resolve => setTimeout(resolve, 0))
				plugin.settings.autoEnlargeBracketsSpace = true;
				await plugin.saveSettings();
				return view.state.doc.toString()
			}
		})
		expect(result).toBe("$$\\left(\\sum\\right)$$")
	})
})
