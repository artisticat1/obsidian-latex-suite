/// <reference types="obsidian-typings" />
import { describe, expect, it } from "vitest";
import { evalInObsidian } from "obsidian-integration-testing";
// import "obsidian-integration-testing/vitest/typings";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import TestPlugin  from "./main";

describe("my-plugin", () => {
	const vault = getTemporaryVault();

	it("should be enabled", async () => {
		const isEnabled = await evalInObsidian({
			input: { pluginId: "obsidian-latex-suite" },
			callback: ({ app, pluginId }) =>
				app.plugins.enabledPlugins.has(pluginId),
			vaultPath: vault.path,
		});
		expect(isEnabled).toBe(true);
	});
	
	it("basic markdown parser", async () => {
		const result = await evalInObsidian({
			input: { pluginId: "obsidian-latex-suite" },
			callback: ({ app, pluginId }) => {
				const plugin = app.plugins.getPlugin(pluginId) as TestPlugin | null;
				if (!plugin) throw new Error("Plugin not found");
				const parser = plugin.test.parser(["math"]);
				if (!parser) throw new Error("Markdown parser not found");
				const parsed = parser.parse("This is a test with $x^2$ and $$y^2$$.");
				return parsed.toString();
			},
		});
		expect(result).toBe("Document(Paragraph(DollarInlineMath(Dollar,LaTeX(Math(MathChar,MathSpecialChar,Number)),Dollar),DollarDisplayMath(Dollar,LaTeX(Math(MathChar,MathSpecialChar,Number)),Dollar)))");
	});
	
	it("parser: math with callouts", async () => {
		const result = await evalInObsidian({
			input: { pluginId: "obsidian-latex-suite" },
			callback: ({ app, pluginId }) => {
				const plugin = app.plugins.getPlugin(pluginId) as TestPlugin | null;
				if (!plugin) throw new Error("Plugin not found");
				const parser = plugin.test.parser(["math"]);
				if (!parser) throw new Error("Markdown parser not found");
				const parsed = parser.parse(
`>[!note] This is a callout with math
> $$
> y^2
>
> $$
`
				);
				return parsed.toString();
			},
		});
		expect(result).toBe("Document(Blockquote(QuoteMark,Paragraph(Link(LinkMark,LinkMark)),QuoteMark,DollarDisplayBlockMath(Dollar,QuoteMark,DisplayMath,QuoteMark,QuoteMark,Dollar)))");
	})
	
	it("parser: math with obsidian comments", async () => {
		const result = await evalInObsidian({
			input: { pluginId: "obsidian-latex-suite" },
			callback: ({ app, pluginId }) => {
				const plugin = app.plugins.getPlugin(pluginId) as TestPlugin | null;
				if (!plugin) throw new Error("Plugin not found");
				const parser = plugin.test.parser(["math"]);
				if (!parser) throw new Error("Markdown parser not found");
				const parsed = parser.parse(
`
%%obsidian comment%%
$y^2$
%%
obsidian display comment
%% $x^2$
`
				);
				return parsed.toString();
			},
		});
		expect(result).toBe("Document(Paragraph(ObsidianComment,DollarInlineMath(Dollar,LaTeX(Math(MathChar,MathSpecialChar,Number)),Dollar)),ObsidianComment,DollarInlineMath(Dollar,LaTeX(Math(MathChar,MathSpecialChar,Number)),Dollar),Paragraph)")
	})
	
	it("parser: html comment with markdown at then end", async () => {
		const result = await evalInObsidian({
			input: { pluginId: "obsidian-latex-suite" },
			callback: ({ app, pluginId }) => {
				const plugin = app.plugins.getPlugin(pluginId) as TestPlugin | null;
				if (!plugin) throw new Error("Plugin not found");
				const parser = plugin.test.parser(["math"]);
				if (!parser) throw new Error("Markdown parser not found");
				const parsed = parser.parse(
`
<!-- html comment -->
*a*
<!--
display html comment
--> *a*
`
				);
				return parsed.toString();
			},
		});
		expect(result).toBe("Document(CommentBlock,Paragraph(Emphasis(EmphasisMark,EmphasisMark)),CommentBlock)")
	})

	it("parser: table math", async () => {
		const result = await evalInObsidian({
			input: { pluginId: "obsidian-latex-suite" },
			callback: ({ app, pluginId }) => {
				const plugin = app.plugins.getPlugin(pluginId) as TestPlugin | null;
				if (!plugin) throw new Error("Plugin not found");
				const parser = plugin.test.parser(["math"]);
				if (!parser) throw new Error("Markdown parser not found");
				const parsed = parser.parse(
`
|$x^2$|$y^2$|
|---|---|
|$x^2$|$y^2$|
`
				);
				return parsed.toString();
			},
		});
		expect(result).toBe("Document(Table(TableHeader(TableDelimiter,TableCell(DollarInlineMath(Dollar,LaTeX(Math(MathChar,MathSpecialChar,Number)),Dollar)),TableDelimiter,TableCell(DollarInlineMath(Dollar,LaTeX(Math(MathChar,MathSpecialChar,Number)),Dollar)),TableDelimiter),TableDelimiter,TableRow(TableDelimiter,TableCell(DollarInlineMath(Dollar,LaTeX(Math(MathChar,MathSpecialChar,Number)),Dollar)),TableDelimiter,TableCell(DollarInlineMath(Dollar,LaTeX(Math(MathChar,MathSpecialChar,Number)),Dollar)),TableDelimiter)))")
	})

});

