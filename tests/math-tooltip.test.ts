import { ContextId, evalInObsidian } from "obsidian-integration-testing";
import { getTemporaryVault } from "obsidian-integration-testing/vitest-global-setup-plugin";
import { describe, beforeAll, it, expect, beforeEach } from "vitest";
import { closeAllTabs, FileContext } from "./setup";
import { createContextId } from "./setup";

async function ensureSettings() {
	await evalInObsidian({
		callback: async ({ lib: { plugin } }) => {
			plugin.settings.mathPreviewEnabled = true;
			plugin.settings.mathPreviewPositionIsAbove = false;
			plugin.settings.mathPreviewLivePreviewDisplay = true;
			await plugin.saveSettings();
		}
	})
}
declare module "obsidian-typings" {
	interface ElectronWindow {
		closeDevTools(): void;
	}
}

async function ensureContext(contextId: ContextId<PreviewContext>) {
	await createContextId(contextId);
	await evalInObsidian({
		contextId,
		callback: async ({ context, app }) => {
			context.isVisible = async (element: Element, threshold: number = 0.1) => {
				return new Promise((resolve) => {
					new IntersectionObserver(
						(entries, observer) => {
							entries.forEach((e) => {
								resolve(e.isVisible);
								observer.disconnect();
							});
						},
						{ trackVisibility: true, threshold, delay: 100 },
					).observe(element);
				});
			};
			const webContents = await electron.remote.getCurrentWebContents();
			const debug = webContents.debugger;
			if (!debug.isAttached()) {
				debug.attach("1.3");
			}
			debug.sendCommand("Emulation.setFocusEmulationEnabled", {enabled: true})
			const leftSideBar = activeDocument.querySelector<HTMLElement>(".mod-sidedock.mod-left-split");
			if (!leftSideBar?.classList.contains("is-sidedock-collapsed")) {
				app.commands.executeCommandById("app:toggle-left-sidebar");
			}
			electronWindow.maximize();
			electronWindow.closeDevTools();
		},
	});
}
declare global {
	interface IntersectionObserverEntry {
		isVisible: boolean;
	}
	interface IntersectionObserverInit {
		trackVisibility?: boolean;
		delay?: number;
	}
}

interface PreviewContext extends FileContext {
	isVisible: (element: Element, threshold?: number) => Promise<boolean>;
}

// Obsidian needs to be maximized for the math preview to be fully visible and IntersectionObserver to work properly.

describe("math preview", () => {
	getTemporaryVault();
	const contextId = new ContextId<PreviewContext>();
	beforeAll(async () => {
		await closeAllTabs();
		await ensureContext(contextId);
		await ensureSettings();	
	})
	beforeEach(async () => {
		await createContextId(contextId);
	})
	
	it("should hide tooltip when dragging text over it", async () => {
		const result = await evalInObsidian({
			contextId,
			callback: async ({ lib: { view } ,context }) => {
				view.setDoc("");
				const isVisible = () =>
					context.isVisible(
						activeDocument.querySelector(
							"div.cm-tooltip-cursor.cm-tooltip",
						)!,
					);
				view.dispatch({
					changes: {
						from: 0,
						to: view.state.doc.length,
						insert: "$$\nE=mc^2\nE=mc^2\nE=mc^2\n$$\nsome text here\nand some more text\nand some more text\n and some more\n text here",
					},
					selection: {
						anchor: "$$\n".length,
						head: "$$\nE=mc^2\nE=mc^2\nE=".length
					}
				});
				const isVisibleBefore = await isVisible();
				const clickPos = "$$\nE=mc^2\nE=a".length;
				const clickCoord = view.coordsAtPos(clickPos)!;
				const mathTooltip = document.querySelector("div.cm-tooltip-cursor.cm-tooltip")!.getBoundingClientRect();
				const startX = (clickCoord.left + clickCoord.right) / 2;
				const startY =
					clickCoord.top + (clickCoord.bottom - clickCoord.top) / 2;
				const endX = (mathTooltip.left + mathTooltip.right) / 2;
				const endY = mathTooltip.bottom;
				const dataTransfer = new DataTransfer();
				const selectionText = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
				dataTransfer.setData("text/plain", selectionText);
				const dragTarget = view.contentDOM;
				dragTarget.dispatchEvent(new DragEvent("dragstart", {
					clientX: startX,
					clientY: startY,
					dataTransfer,
				}))
				async function dragMove(startY: number, endY: number, startX: number, endX: number) {
					const runs = 5;
					for (let i = 0; i <= runs; i++) {
						await nextFrame();
						const fraction = i / runs;
						const x = startX + fraction * (endX - startX);
						const y = startY + fraction * (endY - startY);
						dragTarget.dispatchEvent(new DragEvent("drag", {
							clientX: x,
							clientY: y,
							dataTransfer,
						}));
					}
					await nextFrame();
				}
				await dragMove(startY, endY, startX, endX);
				const isVisibleAfterFirstMove = await isVisible();
				await dragMove(endY, startY, endX, startX);
				const isVisibleAfterSecondMove = await isVisible();
				dragTarget.dispatchEvent(new DragEvent("dragend", {
					clientX: endX,
					clientY: endY,
					dataTransfer,
				}));
				await nextFrame();
				return [isVisibleBefore, isVisibleAfterFirstMove, isVisibleAfterSecondMove];
			},
		});
		expect(result).toEqual([true, false, true]);
	})

	it("should show tooltip fully in table", async () => {
		const result = await evalInObsidian({
			contextId,
			callback: async ({ lib: {view, plugin}, context }) => {
				plugin.settings.mathPreviewPositionIsAbove = true;
				await plugin.saveSettings();
				plugin.ensureEditorMode("preview");
				view.setDoc("|$E=mc^2$|$E=mc^2$|\n|---|---|\n|$E=mc^2$|$E=mc^2$|\n", "|$E=".length);
				await nextFrame();
				plugin.getActiveEditorView()?.focus();
				const tooltips = activeDocument.querySelectorAll("div.cm-tooltip-cursor.cm-tooltip");
				return [tooltips.length, await context.isVisible(tooltips.item(0), 1)]
			},
		});
		expect(result).toEqual([1, true]);
	})	

	it("should show tooltip fully in canvas", async () => {
		const result = await evalInObsidian({
			contextId,
			callback: async ({ lib: {waitUntil, plugin, createNote, pressKey}, context, app }) => {
				plugin.settings.mathPreviewPositionIsAbove = true;
				await plugin.saveSettings();
				context.file =
					app.vault.getFileByPath("canvas.canvas") ??
					await createNote({ path: "canvas.canvas", content: "" });
				await app.vault.modify(context.file, "");
				await context.leaf.openFile(context.file);
				const el = app.workspace.getActiveFileView()!.contentEl;
				const rect = el.getBoundingClientRect();
				const x = (rect.left + rect.right) / 2;
				const y = (rect.top + rect.bottom) / 2;
				const webContents = await electron.remote.getCurrentWebContents();
				webContents.sendInputEvent({type: "mouseMove", x, y})	
				await nextFrame();
				webContents.sendInputEvent({type: "mouseDown", x, y, button: "left", clickCount: 2})
				await nextFrame();
				webContents.sendInputEvent({type: "mouseUp", x, y, button: "left", clickCount: 2})
				await nextFrame();
				await waitUntil({predicate: () => app.workspace.activeEditor?.editor?.cm !== undefined })
				const cView = app.workspace.activeEditor!.editor!.cm;
				const rows = 5;
				const large_matrix = "\\begin{pmatrix}" + Array(rows).fill(0).map(() => Array(rows).fill("0").join("&")).join("\\\\") + "\\end{pmatrix}";
				cView.focus();
				cView.setDoc(`|$${large_matrix}$|$E=mc^2$\n|---|---|\n|$E=mc^2$|$E=mc^2$|\n`, "|$\\begin{pmatrix}0&0&0".length);
				const pos = `|$${large_matrix}$|$E=mc^2$`.length;
				cView.dispatch({
					changes: {
						from: pos,
						to: pos,
						insert: "|"
					}
				})
				await nextFrame();
				pressKey({
					key: "a"
				})
				await nextFrame();
				app.workspace.activeEditor!.editor!.activeCM!.focus();
				let tooltips = activeWindow.document.querySelectorAll("div.cm-tooltip-cursor.cm-tooltip");
				await waitUntil({
					predicate: () => {
						tooltips = activeWindow.document.querySelectorAll("div.cm-tooltip-cursor.cm-tooltip")
						return tooltips.length > 0
					}	
				})
				return [tooltips.length, await context.isVisible(tooltips.item(0), 1)]
			},
		});
		expect(result).toEqual([1, true]);
	})	
	
})
