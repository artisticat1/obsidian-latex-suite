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
	
	it("should insert ` & ` for `$$\\begin{align} \\end{align}$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\begin{align} \\end{align}$$", "$$\\begin{align} ".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString();
			}
		})
		expect(result).toBe("$$\\begin{align}  & \\end{align}$$")
	})
	
	it("should insert ` & ` for `$$\\begin{align}\n1\n\\end{align}$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\begin{align}\n1\n\\end{align}$$", "$$\\begin{align}\n1".length)
				pressKey({
					key: "Tab"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString();
			}
		})
		expect(result).toBe("$$\\begin{align}\n1 & \n\\end{align}$$")
	})
	it("should insert `\\\\ ` for `$$\\begin{align}1\\end{align}$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\begin{align}1\\end{align}$$", "$$\\begin{align}1".length)
				pressKey({
					key: "Enter"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString();
			}
		})
		expect(result).toBe("$$\\begin{align}1 \\\\  \\end{align}$$")
	})

	it("should insert `\\\\ \n` for `$$\\begin{align}\n1\n\\end{align}$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\begin{align}\n1\n\\end{align}$$", "$$\\begin{align}\n1".length)
				pressKey({
					key: "Enter"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString();
			}
		})
		expect(result).toBe("$$\\begin{align}\n1 \\\\\n\n\\end{align}$$")
	})


	it("should insert `\\\\ \n&` for `$$\\begin{align}\n&=20\n\\end{align}$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\begin{align}\n&=20\n\\end{align}$$", "$$\\begin{align}\n&=20".length)
				pressKey({
					key: "Enter"
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.doc.toString();
			}
		})
		expect(result).toBe("$$\\begin{align}\n&=20 \\\\\n&\n\\end{align}$$")
	})
	

	it("should exit matrix for `$$\\begin{align}\n&=20\n\\end{align}$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\begin{align}\n&=20\n\\end{align}$$", "$$\\begin{align}\n&=20".length)
				pressKey({
					key: "Enter",
					modifiers: ["Shift"]
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.selection.main.head;
			}
		})
		expect(result).toBe("$$\\begin{align}\n&=20\n\\end{align}".length)
	})
	

	it("should go to line below in matrix for `$$\\begin{align}\n&=20\n\\end{align}$$`", async () => {
		const result = await evalInObsidian({
			callback: async ({lib}) => {
				const { view, pressKey } = lib;
				view.setDoc("$$\\begin{align}\n&=20\\\\\n&=10+10\n\\end{align}$$", "$$\\begin{align}\n&=20".length)
				pressKey({
					key: "Enter",
					modifiers: ["Shift"]
				})
				await new Promise(resolve => setTimeout(resolve, 0))
				return view.state.selection.main.head;
			}
		})
		expect(result).toBe("$$\\begin{align}\n&=20\\\\\n&=10+10".length)
	})
})
