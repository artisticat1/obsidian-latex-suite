import { beforeEach, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { TFile } from "obsidian";

interface FileContext {
	file: TFile
}

describe("conceal", async () => {
	getTemporaryVault();
	const contextId = new ContextId<FileContext>()
	registerLibResolver(() => window.__latex_suite_test_library)
	await evalInObsidian({
	    contextId,
	    callback: async ({ app, context, obsidianModule, lib }) => {
			context.file =
				app.vault.getFileByPath("test.md") ??
				await app.vault.create("test.md", "");
			const leaf = app.workspace.getLeaf(false)
			await leaf.openFile(context.file)
			if (window.__latex_suite_test_library.view?.state.field(obsidianModule.editorLivePreviewField)) {
				app.commands.executeCommandById("editor:toggle-source");
			}
			lib.plugin.settings.concealEnabled = true;	
			lib.plugin.saveSettings();
	    }
	});
	beforeEach(() => {
		registerLibResolver(() => window.__latex_suite_test_library)
	})
	it("should display mismatched brackets", async () => {
		const result = await evalInObsidian({
			input: {pluginId: "obsidian-latex-suite" },
			callback: ({app, pluginId, obsidianModule, lib }) => {
				const plugin = lib.plugin
				const view = lib.view
				const color = plugin.test.colorPairedBrackets
				// set content to "Einstein's equation is $E=mc^2$."
				const basic_display =
`
$$
\\frac{1}{2
$$
`
				view.setDoc(basic_display)
				const basic_output = color(view, {}).cached_equations
				return basic_output;
				
			}
		})
		expect(result).toMatchSnapshot();
	})

	it.for([
		"$$((#))$$",
		"$$(())$$  $$((#))$$",
		"$$||\\lvert|| Ax - y# ||\\rvert||$$",
		"$$||(||E=mc#^2}||)||$$",
	] as const)(
		"should highlight the innermost enclosing brackets %s",
		async (raw_equation) => {
			const equation = raw_equation.replaceAll(/#|\|\|/g, "");
			const pos = raw_equation.replaceAll("||", "").indexOf("#");
			const positions = raw_equation.includes("||")
				? raw_equation
						.replaceAll("#", "")
						.matchAll(/\|\|/g)
						.map((m, i) => m.index - i * 2)
						.toArray()
				: [pos - 1, pos, pos, pos + 1];
			const first_range = { from: positions[0], to: positions[1] };
			const second_range = { from: positions[2], to: positions[3] };
			const result = await evalInObsidian({
				input: { pluginId: "obsidian-latex-suite", equation, pos },
				callback: ({ lib: { plugin, view }, equation, pos }) => {
					const highlight = plugin.test.highlightCursorBrackets;
					view.setDoc(equation, pos);
					const basic_output = highlight(view);
					return basic_output.toJSON()
				},
			});
			expect(result.length).toBe(2);
			const [first, second] = result;
			expect(first).toMatchObject(first_range)
			expect(second).toMatchObject(second_range)
		},
	);
})
