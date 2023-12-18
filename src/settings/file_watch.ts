import LatexSuitePlugin from "../main";
import { Vault, TFile, TFolder, Notice, debounce, TAbstractFile } from "obsidian";
import { Snippet } from "../snippets/snippets";
import { parseSnippets } from "../snippets/parse_snippets";
import { sortSnippets } from "../snippets/sort";

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
	const snippetDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.snippetsFileLocation);
	const isFolder = snippetDir instanceof TFolder;

	return (isFolder && isInFolder(file, snippetDir));
}

export const onFileChange = async (plugin: LatexSuitePlugin, file: TAbstractFile) => {
	if (!(plugin.settings.loadSnippetsFromFile)) return;
	if (!(file instanceof TFile)) return;

	if (file.path === plugin.settings.snippetsFileLocation || fileIsInSnippetsFolder(plugin, file)) {
		try {
			await refreshSnippetsFromFileOrFolder(plugin);
		}
		catch {
			new Notice("Failed to load snippets.", 5000);
		}
	}
}

export const onFileCreate = (plugin: LatexSuitePlugin, file:TAbstractFile) => {
	if (!(plugin.settings.loadSnippetsFromFile)) return;

	if (file instanceof TFile && fileIsInSnippetsFolder(plugin, file)) {
		refreshSnippetsFromFileOrFolder(plugin);
	}
}

export const onFileDelete = (plugin: LatexSuitePlugin, file:TAbstractFile) => {
	if (!(plugin.settings.loadSnippetsFromFile)) return;

	const snippetDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.snippetsFileLocation);
	const isFolder = snippetDir instanceof TFolder;

	if (file instanceof TFile && (isFolder && file.path.contains(snippetDir.path))) {
		refreshSnippetsFromFileOrFolder(plugin);
	}
}

async function getSnippetsFromFile(vault: Vault, file: TFile) {
	const content = await vault.cachedRead(file);
	let snippets:Snippet[] = [];

	try {
		snippets = await parseSnippets(content);
	}
	catch (e) {
		new Notice(`Failed to load snippet file ${file.name}`);
		console.log(`Failed to load snippet file ${file.path}:`, e);
	}

	return snippets;
}

async function getSnippetsWithinFolder(vault: Vault, folder: TFolder) {
	const snippets:Snippet[] = [];

	for (const fileOrFolder of folder.children) {
		if (fileOrFolder instanceof TFile) {
			snippets.push(...await getSnippetsFromFile(vault, fileOrFolder));
		}
		else if (fileOrFolder instanceof TFolder) {
			const folderSnippets = await getSnippetsWithinFolder(vault, fileOrFolder);
			snippets.push(...folderSnippets);
		}
	}

	return snippets;
}

export async function getSnippetsWithinFileOrFolder(vault: Vault, path: string) {
	let snippets:Snippet[];
	const fileOrFolder = vault.getAbstractFileByPath(path);

	if (fileOrFolder instanceof TFolder) {
		snippets = await getSnippetsWithinFolder(vault, fileOrFolder);
	}
	else if (fileOrFolder instanceof TFile) {
		snippets = await getSnippetsFromFile(vault, fileOrFolder);
	}
	else {
		return [];
	}

	// Sorting needs to happen after all the snippet files have been parsed
	sortSnippets(snippets);
	return snippets;
}

export const refreshSnippetsFromFileOrFolder = debounce(async (plugin: LatexSuitePlugin) => {
	if (!(plugin.settings.loadSnippetsFromFile)) return;

	plugin.processSettings();

	new Notice("Successfully reloaded snippets.", 5000);
}, 500, true);
