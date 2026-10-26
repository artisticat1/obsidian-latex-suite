import { ContextId, registerLibResolver, evalInObsidian } from "obsidian-integration-testing";
import { FileContext } from "./context.test";


export async function createContextId<R extends FileContext, T extends ContextId<R>>(contextId: T) {
	registerLibResolver(() => window.__latex_suite_test_library);
	await evalInObsidian({
		contextId,
		callback: async ({ app, context, obsidianModule, lib }) => {
			context.file =
				app.vault.getFileByPath("test.md") ??
				await app.vault.create("test.md", "");
			const leaf = app.workspace.getLeaf(false);
			await leaf.openFile(context.file);
			if (window.__latex_suite_test_library.view?.state.field(obsidianModule.editorLivePreviewField)) {
				app.commands.executeCommandById("editor:toggle-source");
			}
			console.log(lib.plugin.settings);
			lib.plugin.settings.concealEnabled = true;
			lib.plugin.saveSettings();
		}
	});
	registerLibResolver(() => window.__latex_suite_test_library);
}
