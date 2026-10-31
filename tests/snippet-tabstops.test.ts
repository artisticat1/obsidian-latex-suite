import { ContextId, evalInObsidian, PressKeyParams } from "obsidian-integration-testing";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createContextId } from "./setup";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";


describe("snippet tabstops", () => {
	const contextId = new ContextId();
	getTemporaryVault();
	beforeAll(async () => {
		await createContextId(contextId);
	})
	beforeEach(async () => {
		await evalInObsidian({
			contextId,
			callback: ({ lib: { view} }) => {
				view.setDoc("", 0);
			}
		})
	})
	
	it("should support one tabstop", async () => {
		const result = await evalInObsidian({
			callback: async ({ lib: { view, plugin, typeIntoEditor, editor} }) => {
				await plugin.setSnippets([ {trigger: "123", replacement: "1$0", options: "tA"} ])
				await typeIntoEditor({
					text: "123",
					editor,
				});
				const doc = view.state.doc.toString();
				const selection = view.state.selection.toJSON();
				return {doc, selection};
			}
		})
		expect(result.doc).toBe("1");
		expect(result.selection).toStrictEqual({
			main: 0,
			ranges: [{ anchor: "1".length, head: "1".length }],
		});
	})

	it("should support placeholder tabstops", async () => {
		const result = await evalInObsidian({
			callback: async ({ lib: { view, plugin, typeIntoEditor, editor} }) => {
				await plugin.setSnippets([ {trigger: "123", replacement: "1${0:placeholder}", options: "tA"} ])
				await typeIntoEditor({
					text: "123",
					editor,
				});
				const doc = view.state.doc.toString();
				const selection = view.state.selection.toJSON();
				return {doc, selection};
			}
		})
		expect(result.doc).toBe("1placeholder");
		expect(result.selection).toStrictEqual({
			main: 0,
			ranges: [{ anchor: "1".length, head: "1placeholder".length }],
		});
	})

	it("should support ${VISUAL} selection", async () => {
		const result = await evalInObsidian({
			callback: async ({ lib: { view, plugin, pressKey, editor} }) => {
				view.dispatch({
					changes: { from: 0, to: view.state.doc.length, insert: "some text here" },
					selection: { anchor: "some ".length, head: "some text".length },
				});

				await plugin.setSnippets([ {trigger: "1", replacement: "2${VISUAL}", options: "tvA"} ])
				pressKey({ key: "1" });
				await sleep(0)
				const doc = view.state.doc.toString();
				const selection = view.state.selection.toJSON();
				return {doc, selection};
			}
		})
		expect(result.doc).toBe("some 2text here");
		expect(result.selection).toStrictEqual({
			main: 0,
			ranges: [{ anchor: "some ".length, head: "some 2text".length }],
		});
	})

	it("should support multiple tabstops", async () => {
		const tabstops = 10;
		const result = await evalInObsidian({
			input: { tabstops },
			callback: async ({ lib: { view, plugin, pressKey, typeIntoEditor, editor}, tabstops }) => {
				const replacement = Array(tabstops).fill(null).map((_, i) => `$${i}${i} `).join("");
				await plugin.setSnippets([ {trigger: "123", replacement, options: "tA"} ])
				await typeIntoEditor({
					text: "123",
					editor,
				})
				const selections: unknown[] = []
				selections.push(view.state.selection.toJSON());
				for (let i = 1; i < tabstops; i++) {
					selections.push(view.state.selection.toJSON());
					pressKey({ key: "Tab" });
					await sleep(0);
				}
				const doc = view.state.doc.toString();
				return {doc, selections};
			}
		})
		const doc = Array(tabstops).fill(null).map((_, i) => `${i} `).join("");
		const selections = Array(tabstops)
			.fill(null)
			.map((_, i) => {
				const anchor = Array(Math.max(0, i - 1))
					.fill(null)
					.map((_, j) => `${j} `)
					.join("").length;
				const head = anchor;
				return ({
					main: 0,
					ranges: [
						{
							anchor,
							head,
						},
					],
				});
			});
		expect(result.selections).toStrictEqual(selections);
		expect(result.doc).toBe(doc);
	})

	it("should support undo", async () => {
		let count = 4;
		const result = await evalInObsidian({
			input: { count },
			callback: async ({ lib: { view, plugin, pressKey, typeIntoEditor, editor}, count }) => {
				await plugin.setSnippets([ {trigger: "123", replacement: "$0 hello $1 world $2", options: "tA"} ])
				await typeIntoEditor({ text: "123", editor })
				const selections: {main: number, ranges: {anchor: number, head: number}[]}[] = [view.state.selection.toJSON()];
				const docs: string[] = [view.state.doc.toString()]
				async function pressKeyAndStore(keyParam: PressKeyParams) {
					pressKey(keyParam);
					await sleep(0);
					selections.push(view.state.selection.toJSON());
					docs.push(view.state.doc.toString());
				}
				for (let i = 0; i < count; i++) {	
					await pressKeyAndStore({key: "Tab" })
					await pressKeyAndStore({key: "Z", modifiers: ["Ctrl"] })
					const redoParam: PressKeyParams =
						process.platform === "win32"
							? { key: "Y", modifiers: ["Ctrl"] }
							: { key: "Z", modifiers: ["Ctrl", "Shift"] };

					await pressKeyAndStore(redoParam);
				}
				await pressKeyAndStore({key: "Tab" })
				return {docs, selections};
			}
		})
		const doc = " hello  world ";
		const docs = Array(count).fill([doc, doc, "123"]).flat().concat([doc, doc])
		expect(result.docs).toStrictEqual(docs);
		expect(result.selections.map(s => s.main)).toStrictEqual(Array(count).fill([0, 0, 0]).flat().concat([0, 0]));
		// codemirror doesn't undo/redo selections so revert to the start of reinsertion of the trigger e.g. 0
		expect(result.selections.map((s) => s.ranges)).toStrictEqual(
			["", " hello ", "123"].concat(Array(count - 1).fill(["", " hello ", ""]).flat()).concat(["", " hello "]).map(
				(str) => [{ anchor: str.length, head: str.length }],
			),
		);
	})
})
