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

const refreshFromFileOrFolder = debounce(async (plugin: LatexSuitePlugin) => {
	if (plugin.settings.loadSnippetVariablesFromFile || plugin.settings.loadSnippetsFromFile) {
		plugin.processSettings();
		new Notice("Successfully reloaded snippet/variable files.", 5000);
	}
}, 500, true);

export const onFileChange = async (plugin: LatexSuitePlugin, file: TAbstractFile) => {
	if (!(file instanceof TFile)) return;

	if (plugin.settings.loadSnippetVariablesFromFile && file.path === plugin.settings.snippetVariablesFileLocation 
		|| plugin.settings.loadSnippetsFromFile && file.path === plugin.settings.snippetsFileLocation 
		|| fileIsInFolder(plugin, plugin.settings.snippetVariablesFileLocation, file) 
		|| fileIsInFolder(plugin, plugin.settings.snippetsFileLocation, file)
	) {
		try {
			refreshFromFileOrFolder(plugin);
		}
		catch {
			new Notice("Failed to load snippet/variable files.", 5000);
		}
	}
}

export const onFileCreate = (plugin: LatexSuitePlugin, file: TAbstractFile) => {
	if (!(file instanceof TFile)) return;

	if (plugin.settings.loadSnippetVariablesFromFile && fileIsInFolder(plugin,plugin.settings.snippetVariablesFileLocation, file) 
		|| plugin.settings.loadSnippetsFromFile && fileIsInFolder(plugin,plugin.settings.snippetsFileLocation, file)
	) {
		refreshFromFileOrFolder(plugin);
	}
}

export const onFileDelete = (plugin: LatexSuitePlugin, file: TAbstractFile) => {
	if (!(file instanceof TFile)) return;

	const snippetVariablesDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.snippetVariablesFileLocation);
	const snippetDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.snippetsFileLocation);

	if (plugin.settings.loadSnippetVariablesFromFile && snippetVariablesDir instanceof TFolder && file.path.contains(snippetVariablesDir.path)
	 	|| plugin.settings.loadSnippetsFromFile && snippetDir instanceof TFolder && file.path.contains(snippetDir.path)
	) {
		refreshFromFileOrFolder(plugin);
	}
}

async function getFromFile<T>(vault: Vault, file: TFile, parse: (content: string) => Promise<T>) {
	const content = await vault.cachedRead(file);

	try {
		return await parse(content);
	}
	catch (e) {
		new Notice(`Failed to load snippet/variable file ${file.name}`);
		console.log(`Failed to load snippet/variable file ${file.path}:`, e);
	}
}

async function* getWithinFolder<T>(vault: Vault, folder: TFolder, parse: (content: string) => Promise<T>): AsyncGenerator<T> {
	for (const fileOrFolder of folder.children) {
		if (fileOrFolder instanceof TFile) {
			yield await getFromFile(vault, fileOrFolder, parse);
		}
		else if (fileOrFolder instanceof TFolder) {
			yield* getWithinFolder(vault, fileOrFolder, parse);
		}
	}
}

async function* getWithinFileOrFolder<T>(vault: Vault, path: string, parse: (content: string) => Promise<T>) {
	const fileOrFolder = vault.getAbstractFileByPath(path);
	if (fileOrFolder instanceof TFile) {
		yield await getFromFile(vault, fileOrFolder, parse);
	}
	else if (fileOrFolder instanceof TFolder) {
		yield* getWithinFolder(vault, fileOrFolder, parse);
	}
}

export async function getSnippetVariablesWithinFileOrFolder(vault: Vault, path: string) {
	const snippetVariables: SnippetVariables = {};
	
	for await (const fileSariables of getWithinFileOrFolder(vault, path, parseSnippetVariables)) {
		Object.assign(snippetVariables, fileSariables);
	}
	
	return snippetVariables;
}

export async function getSnippetsWithinFileOrFolder(vault: Vault, path: string, snippetVariables: SnippetVariables) {
	const snippets: Snippet[] = []
	
	for await (const fileSnippets of getWithinFileOrFolder(vault, path, (content) => parseSnippets(content, snippetVariables))) {
		snippets.concat(fileSnippets);
	}
	
	// Sorting needs to happen after all the snippet files have been parsed
	return sortSnippets(snippets);
}
