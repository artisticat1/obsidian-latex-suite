import LatexSuitePlugin from "../main";
import { Vault, TFile, TFolder, Notice, debounce, TAbstractFile } from "obsidian";
import { Snippet } from "../snippets/snippets";
import { parseSnippets, parseSnippetVariables, type SnippetVariables } from "../snippets/parse";
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

function fileIsInFolder(plugin: LatexSuitePlugin, folderPath: string, file: TFile) {
	const snippetDir = plugin.app.vault.getAbstractFileByPath(folderPath);
	const isFolder = snippetDir instanceof TFolder;

	return (isFolder && isInFolder(file, snippetDir));
}

export const onFileChange = async (plugin: LatexSuitePlugin, file: TAbstractFile) => {
	if (!(file instanceof TFile)) return;

	if (plugin.settings.loadSnippetVariablesFromFile && file.path === plugin.settings.snippetVariablesFileLocation || fileIsInFolder(plugin, plugin.settings.snippetVariablesFileLocation, file)) {
		try {
			refreshSnippetVariablesFromFileOrFolder(plugin);
		}
		catch {
			new Notice("Failed to load snippet variables.", 5000);
		}
	}

	if (plugin.settings.loadSnippetsFromFile && file.path === plugin.settings.snippetsFileLocation || fileIsInFolder(plugin, plugin.settings.snippetsFileLocation, file)) {
		try {
			refreshSnippetsFromFileOrFolder(plugin);
		}
		catch {
			new Notice("Failed to load snippets.", 5000);
		}
	}
}

export const onFileCreate = (plugin: LatexSuitePlugin, file:TAbstractFile) => {
	if (!(file instanceof TFile)) return;

	if (plugin.settings.loadSnippetVariablesFromFile && fileIsInFolder(plugin,plugin.settings.snippetVariablesFileLocation, file)) {
		refreshSnippetVariablesFromFileOrFolder(plugin);
	}

	if (plugin.settings.loadSnippetsFromFile && fileIsInFolder(plugin,plugin.settings.snippetsFileLocation, file)) {
		refreshSnippetsFromFileOrFolder(plugin);
	}
}

export const onFileDelete = (plugin: LatexSuitePlugin, file:TAbstractFile) => {
	if (!(file instanceof TFile)) return;

	const snippetVariablesDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.snippetVariablesFileLocation);

	if (plugin.settings.loadSnippetVariablesFromFile && (snippetVariablesDir instanceof TFolder && file.path.contains(snippetVariablesDir.path))) {
		refreshSnippetVariablesFromFileOrFolder(plugin);
	}

	const snippetDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.snippetsFileLocation);

	if (plugin.settings.loadSnippetsFromFile && (snippetDir instanceof TFolder && file.path.contains(snippetDir.path))) {
		refreshSnippetsFromFileOrFolder(plugin);
	}
}

async function getSnippetVariablesFromFile(vault: Vault, file: TFile) {
	const content = await vault.cachedRead(file);
	let snippetVariables: SnippetVariables = {};

	try {
		snippetVariables = await parseSnippetVariables(content);
	}
	catch (e) {
		new Notice(`Failed to load snippet variables file ${file.name}`);
		console.log(`Failed to load snippet variables file ${file.path}:`, e);
	}

	return snippetVariables;
}

async function getSnippetsFromFile(vault: Vault, file: TFile, snippetVariables: SnippetVariables) {
	const content = await vault.cachedRead(file);
	let snippets:Snippet[] = [];

	try {
		snippets = await parseSnippets(content, snippetVariables);
	}
	catch (e) {
		new Notice(`Failed to load snippet file ${file.name}`);
		console.log(`Failed to load snippet file ${file.path}:`, e);
	}

	return snippets;
}

async function getSnippetVariablesWithinFolder(vault: Vault, folder: TFolder) {
	const snippetVariables: SnippetVariables = {};

	for (const fileOrFolder of folder.children) {
		if (fileOrFolder instanceof TFile) {
			Object.assign(snippetVariables, await getSnippetVariablesFromFile(vault, fileOrFolder));
		}
		else if (fileOrFolder instanceof TFolder) {
			Object.assign(snippetVariables, await getSnippetVariablesWithinFolder(vault, fileOrFolder));
		}
	}

	return snippetVariables;
}

async function getSnippetsWithinFolder(vault: Vault, folder: TFolder, snippetVariables: SnippetVariables) {
	const snippets:Snippet[] = [];

	for (const fileOrFolder of folder.children) {
		if (fileOrFolder instanceof TFile) {
			snippets.push(...await getSnippetsFromFile(vault, fileOrFolder, snippetVariables));
		}
		else if (fileOrFolder instanceof TFolder) {
			const folderSnippets = await getSnippetsWithinFolder(vault, fileOrFolder, snippetVariables);
			snippets.push(...folderSnippets);
		}
	}

	return snippets;
}

export async function getSnippetVariablesWithinFileOrFolder(vault: Vault, path: string) {
	const fileOrFolder = vault.getAbstractFileByPath(path);

	if (fileOrFolder instanceof TFolder) {
		return await getSnippetVariablesWithinFolder(vault, fileOrFolder);
	}
	else if (fileOrFolder instanceof TFile) {
		return await getSnippetVariablesFromFile(vault, fileOrFolder);
	}
	else {
		return {};
	}
}

export async function getSnippetsWithinFileOrFolder(vault: Vault, path: string, snippetVariables: SnippetVariables) {
	let snippets:Snippet[];
	const fileOrFolder = vault.getAbstractFileByPath(path);

	if (fileOrFolder instanceof TFolder) {
		snippets = await getSnippetsWithinFolder(vault, fileOrFolder, snippetVariables);
	}
	else if (fileOrFolder instanceof TFile) {
		snippets = await getSnippetsFromFile(vault, fileOrFolder, snippetVariables);
	}
	else {
		return [];
	}

	// Sorting needs to happen after all the snippet files have been parsed
	snippets = sortSnippets(snippets);
	return snippets;
}

export const refreshSnippetVariablesFromFileOrFolder = debounce(async (plugin: LatexSuitePlugin) => {
	if (!(plugin.settings.loadSnippetVariablesFromFile)) return;

	plugin.processSettings();

	new Notice("Successfully reloaded snippet variables.", 5000);
}, 500, true);

export const refreshSnippetsFromFileOrFolder = debounce(async (plugin: LatexSuitePlugin) => {
	if (!(plugin.settings.loadSnippetsFromFile)) return;

	plugin.processSettings();

	new Notice("Successfully reloaded snippets.", 5000);
}, 500, true);
