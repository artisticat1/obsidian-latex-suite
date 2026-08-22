import { beforeAll, describe, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
import TestPlugin from "./main";
import { MarkdownView, TFile } from "obsidian";
import { EditorView } from "@codemirror/view";
import { readFileSync } from "fs";
import * as ts from "typescript"

interface FileContext {
	file: TFile;
	snippets: TFile;
}

declare module "obsidian-integration-testing" {
	interface Lib {
		plugin: TestPlugin;
		mdView: MarkdownView;
		view: EditorView;
	}
}


describe("snippet environment options", () => {
	const contextId = new ContextId<FileContext>();
	registerLibResolver(() => window.__latex_suite_test_library)
	beforeAll(async () => {
		await evalInObsidian({
			contextId,
			callback: async ({ app, context, lib: {createNote, plugin}, obsidianModule }) => {
				const file = app.vault.getFileByPath("test.md");
				if (file) {
					context.file = file;
				} else {
					context.file = await createNote({content: "", path: "test.md"});
				}
				const snippets = app.vault.getFileByPath("snippets.js");
				if (snippets) {
					context.snippets = snippets;
				} else {
					context.snippets = await createNote({content: "", path: "snippets.js"});
				}
				const leaf = app.workspace.getLeaf(false);
				await leaf.openFile(context.file);
				plugin.setLib();
				if (window.__latex_suite_test_library.view?.state.field(obsidianModule.editorLivePreviewField)) {
					app.commands.executeCommandById("editor:toggle-source");
				}
			},
		});
	});
	registerLibResolver(() => window.__latex_suite_test_library)
	it("test context", async () => {
		const raw_snippets = readFileSync("./tests/context-snippets.ts", "utf-8");
		const compiled_raw_snippets = ts.transpile(raw_snippets, {
			// keep esm
			module: ts.ModuleKind.ESNext,
			target: ts.ScriptTarget.ESNext,
			moduleResolution: ts.ModuleResolutionKind.NodeNext,	
		});
		console.log(compiled_raw_snippets)
	});
});
