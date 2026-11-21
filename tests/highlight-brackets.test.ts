import { beforeEach, describe, expect, it } from "vitest";
import { ContextId, evalInObsidian, registerLibResolver } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { TFile } from "obsidian";

interface FileContext {
	file: TFile
}

describe("highlight brackets", async () => {
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
	
	// use <%0[[bracket]]%> to indicate a bracket and the color. 0-1-2 for color and error for mismatched.
	it.for([
		["$$\\frac{1}{2$$", "$$\\frac<%0{%>1<%0}%><%error{%>2$$"],
		["$$(())$$", "$$<%0(%><%1(%><%1)%><%0)%>$$"],
		["$$[[]]$$", "$$<%0[%><%1[%><%1]%><%0]%>$$"],
		["$$\\{\\}$$", "$$<%0\\{%><%0\\}%>$$"],
		["$$\\lvert\\rvert$$", "$$<%0\\lvert%><%0\\rvert%>$$"],
		["$$[[]] E[E[X|Y]] [([])]$$", "$$<%0[%><%1[%><%1]%><%0]%> E<%0[%>E<%1[%>X|Y<%1]%><%0]%> <%0[%><%1(%><%2[%><%2]%><%1)%><%0]%>$$"],
	])(
		"should display mismatched brackets",
		async ([equation, equation_with_tags]) => {
			let index = 0;
			const expected_colors_arr = equation_with_tags
				.slice(2, -2)
				.matchAll(/<%(\d|error)(.+?)%>/g)
				.map((m) => {
					const pos = m.index - index;
					const bracket = m[2].length;
					const className =
						m[1] === "error"
							? "latex-suite-mismatched-bracket"
							: `latex-suite-color-bracket-${m[1]}`;
					index += m[0].length - m[2].length;
					return {
						pos,
						bracket,
						className,
					};
				})
				.toArray();
			const expected_colors = {
				[equation.slice(2, -2)]: expected_colors_arr,
			};
			const result = await evalInObsidian({
				input: { equation },
				callback: ({ lib: { plugin, view }, equation }) => {
					const color = plugin.test.colorPairedBrackets;
					view.setDoc(equation);
					const result = color(view, {}).cached_equations;
					const sorted_result = Object.fromEntries(
						Object.entries(result).map(([eq, colors]) => [
							eq,
							colors.sort((a, b) => a.pos - b.pos),
						]),
					);
					return sorted_result;
				},
			});

			expect(result).toStrictEqual(expected_colors);
		},
	);

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
