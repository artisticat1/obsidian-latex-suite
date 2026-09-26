import { beforeAll, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, PressKeyParams, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { RawSnippet } from "./main";
import { setAppConfig } from "obsidian-integration-testing";

interface PatchedLib {
	pressKey: (params: PressKeyParams, window?: Window) => void;
}

describe("snippet editor ui", async () => {
	registerLibResolver(() => window.__latex_suite_test_library)
	getTemporaryVault();
	await setAppConfig({ configKey: "settingsPopoutWindow", value: true });
	const contextId = new ContextId<PatchedLib>()
	beforeAll(async () => {
		await evalInObsidian({
			contextId,
			callback: async ({ app, context, obsidianModule }) => {
				context.pressKey = (
					pressParams: PressKeyParams,
					window?: Window,
				) => {
					const electron = window?.electron ?? globalThis.electron;
					const { key, modifiers = [] } = pressParams;
					const isMacOS = obsidianModule.Platform.isMacOS;
					const electronModifiers = modifiers.map((modifier) => {
						switch (modifier) {
							case "Alt": {
								return "alt";
							}
							case "Ctrl": {
								return "control";
							}
							case "Meta": {
								return "meta";
							}
							case "Mod": {
								return isMacOS ? "meta" : "control";
							}
							case "Shift": {
								return "shift";
							}
							default: {
								const unknownModifier = modifier;
								throw new Error(
									`Unknown modifier: ${String(unknownModifier)}`,
								);
							}
						}
					});
					const webContents = electron.remote.getCurrentWebContents();
					webContents.sendInputEvent({
						keyCode: key,
						modifiers: electronModifiers,
						type: "keyDown",
					});
					webContents.sendInputEvent({
						keyCode: key,
						modifiers: electronModifiers,
						type: "char",
					});
					webContents.sendInputEvent({
						keyCode: key,
						modifiers: electronModifiers,
						type: "keyUp",
					});
				};
			},
		});
	});
	
	it("should render settings page and be able to edit snippets", async () => {
		const snippet = JSON.stringify({
			trigger: "mk",
			replacement: "${}$0{}$",
			options: "mA",
			priority: Math.random(),
		} satisfies RawSnippet);
		const result = await evalInObsidian({
			contextId,
			input: { snippet },
			callback: async ({ app, context, obsidianModule, lib, snippet }) => {
				const { settings_translation, EditorView } = lib.plugin.test;
				app.setting.open();
				const settingEl = app.setting.contentEl.querySelector(`[data-setting-id="obsidian-latex-suite"]`);
				if (!settingEl) {
					throw new Error("Setting element not found")
				}
				settingEl.dispatchEvent(new MouseEvent("click", { bubbles: true }))
				const snippetsEl = Array.from(
					app.setting.contentEl.querySelectorAll<HTMLDivElement>(
						"div.setting-item-name",
					),
				).filter(
					(el) =>
						el.textContent.trim() ===
						settings_translation("snippets.heading").trim(),
				);
				const firstSnippetEl = snippetsEl[0];
				if (!firstSnippetEl) {
					throw new Error("First snippet element not found")
				}
				firstSnippetEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				const snippetEditor = app.setting.contentEl.querySelector<HTMLDivElement>("div.snippets-text-area");
				if (!snippetEditor) {
					throw new Error("Snippet editor not found")
				}
				const view = EditorView.findFromDOM(snippetEditor)
				if (!view) {
					throw new Error("EditorView not found")
				}
				view.focus();	
				view.setDoc("export default [\n    \n]", "export default [\n    ".length);
				await new Promise((resolve) => setTimeout(resolve, 0));
				for (const char of snippet) {
					context.pressKey({ key: char}, activeWindow) 
				}
				// save delay of 500ms and need to await the last keypress first.
				await new Promise((resolve) => setTimeout(resolve, 0));
				await new Promise((resolve) => setTimeout(resolve, 500));
				return lib.plugin.settings.snippets;
			}
		})
		expect(result).toBe(`export default [\n    ${snippet}\n]`);
	})
})
