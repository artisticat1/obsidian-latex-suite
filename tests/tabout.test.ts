
import { describe, expect, it } from "vitest";
import { evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";

function taboutTest(doc: string, cursorPos: number, expectedTaboutCursorPos: number, expectedReverseTaboutCursorPos?: number) {
	return evalInObsidian({
		input: {
			doc,
			cursorPos
		},
		callback: async ({lib, doc, cursorPos}) => {
			const { view, pressKey } = lib;
			view.setDoc(doc, cursorPos)
			pressKey({
				key: "Tab"
			})
			await new Promise(resolve => setTimeout(resolve, 0))
			const taboutCursorPos = view.state.selection.main.head
			view.setDoc(doc, cursorPos)
			pressKey({
				key: "Tab",
				modifiers: ["Shift"]
			})
			await new Promise(resolve => setTimeout(resolve, 0))
			const reverseTaboutCursorPos = view.state.selection.main.head
			return [taboutCursorPos, reverseTaboutCursorPos]
		}
	}).then(result => {
		expect(result[0]).toBe(expectedTaboutCursorPos);
		if (expectedReverseTaboutCursorPos !== undefined) {	
			expect(result[1]).toBe(expectedReverseTaboutCursorPos);
		}
	})
}

describe("tabout brackets and math delimiters", async () => {
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
		await taboutTest("$()$", "$(".length, "$()".length, "$".length)
	})

	it("should exit for `$E_{filler}=mc^2$`", async () => {
		await taboutTest("$E_{filler}=mc^2$", "$E_{filler}=mc^2".length, "$E_{filler}=mc^2$".length, "$E_".length)
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
		await taboutTest(
			"$$E_{filler}=mc^2$$",
			"$$E_{filler}=mc^2".length,
			"$$E_{filler}=mc^2$$".length,
			"$$E_".length
		);
	})
	
	it("should skip unbalanced brackets for `$$1_{[0,1)}$$`", async () => {
		await taboutTest(
			"$$1_{[0,1)}$$",
			"$$1_{[0,1)".length,
			"$$1_{[0,1)}".length,
			"$$1_{".length
		);
	})
	
	it("should go to right command for `$$\\left| \\right.$$", async () => {
		await taboutTest(
			"$$\\left| \\right.$$",
			"$$\\left| ".length,
			"$$\\left| \\right.".length,
			"$$".length
		);
	})
	

	it("should go to right command for `$$ \\right.$$", async () => {
		await taboutTest("$$ \\right.$$", "$$ ".length, "$$ \\right.".length, "".length);
	})
	
	it("should tabout inside a matrix for `$$\\begin{matrix}\n\\text{test}\n\\end{matrix}$$`", async () => {
		await taboutTest(
			"$$\\begin{matrix}\n\\text{test}\n\\end{matrix}$$",
			"$$\\begin{matrix}\n\\text{test".length,
			"$$\\begin{matrix}\n\\text{test}".length,
			"$$\\begin{matrix}\n\\text".length
		);
	})
})
