import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { TFile } from "obsidian";
import type { Mode } from "../src/editor_context/options";
import { createContextId } from "./setup";

export interface FileContext {
	file: TFile
}

function getEditorContext(doc: string, cursorPos: number) {
	return evalInObsidian({
		input: {doc, cursorPos},
		callback: async ({lib: {view, plugin}, doc, cursorPos}) => {
			view.setDoc(doc, cursorPos)
			return plugin.test.getContextPlugin(view).mode;
		}
	})
}

function expectMode(result: Mode, expected: Partial<Mode>) {
	const copy = Object.fromEntries(Object.entries(result).map(([key, value]) => [key, expected[key as keyof Mode] ?? false]));
	expect(result).toStrictEqual(copy)
}

describe("math context", async () => {
	getTemporaryVault();
	const contextId = new ContextId<FileContext>()
	beforeAll(async () => {
		await createContextId(contextId)
	})
	beforeEach(() => {
		registerLibResolver(() => window.__latex_suite_test_library)
	})
	it("should be block math for simple einstein equation", async () => {
		const result = await getEditorContext("$$E=mc^2$$", "E=mc^2".length)
		expectMode(result, {
			blockMath: true,
		})
	})

	it("should be blockmath in latex codeblock inside $$...$$", async () => {
		const result = await getEditorContext("~~~latex\n$$E=mc^2$$\n~~~", "~~~latex\n$$E=mc^2".length)
		expectMode(result, {
			blockMath: true,
			codeBlock: "latex",
		})
	})
	
	it("should be inline math in latex codeblock inside $...$", async () => {
		const result = await getEditorContext("~~~latex\n$E=mc^2$\n~~~", "~~~latex\n$E=mc^2".length)
		expectMode(result, {
			inlineMath: true,
			codeBlock: "latex",
		})
	})

	it("should be inline math inside $...$ with text", async () => {
		const result = await getEditorContext("$E=mc^2$", "$E=".length)
		expectMode(result, {
			inlineMath: true,
		})
	})
	
	it("should be block math inside latex codeblock inside \\[ ... \\]", async () => {
		const result = await getEditorContext("~~~latex\n\\[E=mc^2\\]\n~~~", "~~~latex\n\\[E=mc^2".length)
		expectMode(result, {
			blockMath: true,
			codeBlock: "latex",
		})
	})

	it("should be inline math inside latex codeblock inside \\( ... \\]", async () => {
		const result = await getEditorContext("~~~latex\n\\(E=mc^2\\)\n~~~", "~~~latex\n\\(E=mc^2".length)
		expectMode(result, {
			blockMath: true,
			codeBlock: "latex",
		})
	})
	
	it("should be math for math codeblock", async () => {
		const result = await getEditorContext("~~~math\nE=mc^2\n~~~", "~~~math\nE=mc^2".length)
		expectMode(result, {
			codeMath: true,
		})
	})
	
})
