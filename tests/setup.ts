import { ContextId, registerLibResolver, evalInObsidian, withAppConfig } from "obsidian-integration-testing";
import { TFile, WorkspaceLeaf } from "obsidian";


export async function createContextId<R extends FileContext, T extends ContextId<R>>(contextId: T) {
	registerLibResolver(() => window.__latex_suite_test_library);
	await evalInObsidian({
		contextId,
		callback: async ({ app, context, lib }) => {
			context.file =
				app.vault.getFileByPath("test.md") ??
				await app.vault.create("test.md", "");
			const leaf = app.workspace.getLeaf(false);
			await leaf.openFile(context.file);
			context.leaf = leaf;
			lib.plugin.ensureEditorMode("source");
			lib.plugin.settings.concealEnabled = true;
			await lib.plugin.saveSettings();
			lib.plugin.setLib();
			window.__latex_suite_test_library.view?.focus()
		}
	});
	registerLibResolver(() => window.__latex_suite_test_library);
}

export async function closeAllTabs() {
	await evalInObsidian({
		callback: async ({ app }) => {
			app.commands.executeCommandById("workspace:close-others")
		}
	})
}
export interface FileContext {
	file: TFile;
	leaf: WorkspaceLeaf;
}
