import { beforeAll, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
import type TestPlugin from "./main";
import { type MarkdownView, type TFile } from "obsidian";
import { type EditorView } from "@codemirror/view";
import { readFileSync } from "fs";
import * as ts from "typescript"
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import context_snippets, { transactionSpec } from "./context-snippets"
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
	const vault = getTemporaryVault();
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
				plugin.settings.snippetsFileLocation = context.snippets.path;
				plugin.settings.loadSnippetsFromFile = true;
				await plugin.saveSettings();
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
		const result = await evalInObsidian({
			contextId,
			callback: async ({
				app,
				context,
				lib: { view, plugin, pressKey },
				compiled_raw_snippets,
				transactionSpec,
				context_snippets,
			}) => {
				await app.vault.modify(context.snippets, compiled_raw_snippets);
				// speed up the test by disabling math preview and conceal.
				plugin.settings.mathPreviewEnabled = false;
				plugin.settings.concealEnabled = false;
				await plugin.saveSettings();
				const results = [];
				for (const spec of transactionSpec) {
					for (let i=0; i < context_snippets.length; i++) {
						const snippet = context_snippets[i];
						const pos = spec.pos;
						const text = spec.text.slice(0, pos) + i.toString() + spec.text.slice(pos);
						const new_pos = pos + i.toString().length;
						view.setDoc(text, new_pos);
						pressKey({ key: "Tab" });
						// let the transaction finish first.
						await new Promise((resolve) => setTimeout(resolve, 0));
						const changed_doc = view.state.doc.toString();
						const trigger = snippet.trigger;
						const info = { snippet: snippet.name, applied: false, text: changed_doc, old_text: text, trigger };
						if (spec.names.includes(snippet.name) && changed_doc !== spec.text) {
							info.applied = true;
							results.push(info);
						} else if (!spec.names.includes(snippet.name) && changed_doc === spec.text) {
							results.push(info);
						}
					}
				}
				return results;
			},
			input: { compiled_raw_snippets, context_snippets, transactionSpec },
		});
		expect(result).toStrictEqual([]);
	}, 20_000);
});
