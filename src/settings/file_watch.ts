import LatexSuitePlugin from "../main";
import { TFile, TFolder, Notice, debounce, TAbstractFile } from "obsidian";
import { ParsedSnippet } from "../snippets/snippets";
import { parseSnippets, sortSnippets } from "../snippets/parse_snippets";

function isInFolder(file: TFile, dir: TFolder) {

	let cur = file.parent;
	let cnt = 0;

	while (cur && (!cur.isRoot()) && (cnt < 100)) {

		if (cur.path === dir.path) return true;

		cur = cur.parent;
		cnt++;
	}

	return false;
}

function fileIsInSnippetsFolder(plugin: LatexSuitePlugin, file: TFile) {
	const snippetDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.basicSettings.snippetsFileLocation);
	const isFolder = snippetDir instanceof TFolder;

	return (isFolder && isInFolder(file, snippetDir));
}

export async function onFileChange(plugin: LatexSuitePlugin, file: TAbstractFile) {

	if (!(plugin.settings.basicSettings.loadSnippetsFromFile)) return;
	if (!(file instanceof TFile)) return;

	if (file.path === plugin.settings.basicSettings.snippetsFileLocation || fileIsInSnippetsFolder(plugin, file)) {
		try {
			await refreshSnippetsFromFileOrFolder(plugin);
		}
		catch {
			new Notice("Failed to load snippets.", 5000);
		}
	}
}

export const onFileCreate = (plugin: LatexSuitePlugin, file:TAbstractFile) => {
	if (!(plugin.settings.basicSettings.loadSnippetsFromFile)) return;

	if (file instanceof TFile && fileIsInSnippetsFolder(plugin, file)) {
		refreshSnippetsFromFileOrFolder(plugin);
	}
}

export const onFileDelete = (plugin: LatexSuitePlugin, file:TAbstractFile) => {
	if (!(plugin.settings.basicSettings.loadSnippetsFromFile)) return;

	const snippetDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.basicSettings.snippetsFileLocation);
	const isFolder = snippetDir instanceof TFolder;

	if (file instanceof TFile && (isFolder && file.path.contains(snippetDir.path))) {
		refreshSnippetsFromFileOrFolder(plugin);
	}
}

async function getSnippetsWithinFolder(folder: TFolder) {
	const snippets:ParsedSnippet[] = [];

	for (const fileOrFolder of folder.children) {
		if (fileOrFolder instanceof TFile) {

			const content = await this.app.vault.cachedRead(fileOrFolder as TFile);

			try {
				snippets.push(...parseSnippets(content));
			}
			catch (e) {
				console.log(`Failed to load snippet file ${fileOrFolder.path}:`, e);
				new Notice(`Failed to load snippet file ${fileOrFolder.name}`);
			}

		}
		else {
			const newSnippets = await getSnippetsWithinFolder(fileOrFolder as TFolder);
			snippets.push(...newSnippets);
		}
	}

	return snippets;
}

export async function getSnippetsWithinFileOrFolder(path: string) {
	let snippets:ParsedSnippet[];
	const fileOrFolder = window.app.vault.getAbstractFileByPath(path);

	if (fileOrFolder instanceof TFolder) {
		snippets = await getSnippetsWithinFolder(fileOrFolder as TFolder);

	} else {
		const content = await window.app.vault.cachedRead(fileOrFolder as TFile);
		snippets = await parseSnippets(content);
	}

	// Sorting needs to happen after all the snippet files have been parsed
	sortSnippets(snippets);
	return snippets;
}

export const refreshSnippetsFromFileOrFolder = debounce(async (plugin: LatexSuitePlugin) => {
	if (!(plugin.settings.basicSettings.loadSnippetsFromFile)) return;

	plugin.processSettings();

	new Notice("Successfully reloaded snippets.", 5000);
}, 500, true);
