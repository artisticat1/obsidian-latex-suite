import LatexSuitePlugin from "../main";
import { Vault, TFile, TFolder, TAbstractFile, Notice, debounce, Platform } from "obsidian";
import { Snippet } from "../snippets/snippets";
import { parseSnippets, parseSnippetVariables, type SnippetVariables } from "../snippets/parse";
import { sortSnippets } from "src/snippets/sort";
import { difference, intersection } from "src/utils/prototype_utils";

type FSWatcher = ReturnType<typeof import("fs").watch>

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

const refreshFromFiles = debounce(async (plugin: LatexSuitePlugin) => {
	if (!(plugin.settings.loadSnippetVariablesFromFile || plugin.settings.loadSnippetsFromFile)) {
		return;
	}

	await plugin.processSettings(false, true);

}, 500, true);

/**
 * Create a file watcher using either obsidian publics api, obsidians internal fs adapter for hidden files inside the vault
 * or nodejs on the desktop for absolute paths.
 * In case that people use sync with untrusted people, they can still use files while those files won't be synced.
 */
export async function fileWatch(plugin: LatexSuitePlugin) {
	const snippetPath = plugin.settings.snippetsFileLocation;
	const variablePath = plugin.settings.snippetVariablesFileLocation;
	// Don't create 2 file watchers for the same file/folder.
	if (plugin.settings.loadSnippetVariablesFromFile && plugin.settings.loadSnippetsFromFile) {
		if (snippetPath === variablePath) {
			return generateFileWatchers(plugin, snippetPath);
		}
		const startsWithSeperator = (path: string) => path.startsWith("/") || path.startsWith("\\");
		if (snippetPath.startsWith(variablePath) && startsWithSeperator(variablePath.slice(snippetPath.length))) {
			return generateFileWatchers(plugin, snippetPath);
		} else if (variablePath.startsWith(snippetPath) && startsWithSeperator(snippetPath.slice(variablePath.length))) {
			return generateFileWatchers(plugin, variablePath);
		}
		const snippetCloser = await generateFileWatchers(plugin, snippetPath);
		const variableCloser = await generateFileWatchers(plugin, variablePath);
		return () => {
			snippetCloser();
			variableCloser();
		}
	}
		
	const variablesWatcher = plugin.settings.loadSnippetVariablesFromFile
		? await generateFileWatchers(
				plugin,
				plugin.settings.snippetVariablesFileLocation,
			)
		: null;
	const snippetsWatcher = plugin.settings.loadSnippetsFromFile
		? await generateFileWatchers(plugin, plugin.settings.snippetsFileLocation)
		: null;	

	return () => {
		variablesWatcher?.();
		snippetsWatcher?.();
	}
}

async function AbsolutePath(path: string) {
	if (!Platform.isDesktop) {
		return null
	}
	const fs = require("fs") as typeof import("fs");
	const node_path = require("path") as typeof import("path");
	if (path.slice(0, 2) === "~/") {
		const os = require("os") as typeof import("os");
		const homeDir = os.homedir();
		path = node_path.join(homeDir, path.slice(2));
	}
	if (!node_path.isAbsolute(path)) {
		return null;
	}
	return {fs, node_path, path}
}

async function generateFileWatchers(plugin: LatexSuitePlugin, path: string) {
	const vault = plugin.app.vault;
	const fileOrFolder = vault.getAbstractFileByPath(path);
	if (fileOrFolder) {
		const events = [	
			vault.on("modify", (file) => onFileChange(plugin, file)),
			vault.on("create", (file) => onFileChange(plugin, file)),
			vault.on("delete", (file) => onFileChange(plugin, file)),
		]
		return () => events.forEach(event => vault.offref(event));
	}
	const nodeLibs = await AbsolutePath(path)
	if (nodeLibs !== null) {
		const fs = nodeLibs.fs;
		path = nodeLibs.path;
		const watcher = fs.watch(path, { recursive: true }, (event, _filename) => {
			if (event === "rename") return;
			refreshFromFiles(plugin);
		})
		return () => watcher.close();
	}
	const stat = await vault.adapter.stat(path);
	if (stat) {
		type InternalFs = {
			fs?: {
				watch?: (
					path: string,
					options: { recursive: boolean },
					callback: (event: "change"| "rename", filename: string) => void,
				) => FSWatcher;
			};
			getFullPath?: (path: string) => string;
		};
		const adapter = vault.adapter as unknown as InternalFs;
		const fullPath = adapter.getFullPath?.(path);
		if (!fullPath) {
			return () => {};
		}

		const watcher = adapter.fs?.watch?.(fullPath, { recursive: true }, (event, _filename) => {
			if (event === "rename") return;
			refreshFromFiles(plugin);
		})
		return () => watcher?.close();
	}
	return () => {};
}

export const onFileChange = async (plugin: LatexSuitePlugin, file: TAbstractFile) => {
	if (!(file instanceof TFile)) return;

	if (plugin.settings.loadSnippetVariablesFromFile && file.path === plugin.settings.snippetVariablesFileLocation
		|| plugin.settings.loadSnippetsFromFile && file.path === plugin.settings.snippetsFileLocation
		|| fileIsInFolder(plugin, plugin.settings.snippetVariablesFileLocation, file)
		|| fileIsInFolder(plugin, plugin.settings.snippetsFileLocation, file)
	) {
		refreshFromFiles(plugin);
	}
}

function* generateFilesWithin(fileOrFolder: TAbstractFile): Generator<TFile> {
	if (fileOrFolder instanceof TFile)
		yield fileOrFolder;

	else if (fileOrFolder instanceof TFolder)
		for (const child of fileOrFolder.children)
			yield* generateFilesWithin(child);
}

type FsLike = {
	stat: (path: string) => Promise<{ type: "file" | "folder"} | null>;
	list: (path: string) => Promise<{ files: string[] }>;
	read: (path: string) => Promise<string>;
}

async function walkRecursive(path: string, fsLike: FsLike): Promise<File[]> {
	const stat = await fsLike.stat(path);
	if (stat?.type === "file") {
		const name = path.split("/").pop() || path;
		const read = () => fsLike.read(path);
		return [{ name, path, read }];
	} else if (stat?.type === "folder") {
		const files = await fsLike.list(path);
		const promises = files.files.map(
			async (file) => await walkRecursive(file, fsLike),
		);
		return (await Promise.all(promises)).flat();
	}
	return [];
}

// Async helper functions such as Array.fromAsync still are not widely supported/in proposal stages.
async function generateFilesWithinHidden(vault: Vault, path: string): Promise<File[] | null> {
	const hiddenFileOrFolder = await vault.adapter.exists(path);
	if (hiddenFileOrFolder === null) {
		return null;
	}
	const files = await walkRecursive(path, vault.adapter);
	return files
}

async function genereteFilesWithinAbsolutePaths(path: string): Promise<File[] | null> {
	if (!Platform.isDesktop) {
		return null
	}
	const nodeLibs = await AbsolutePath(path);
	if (nodeLibs === null) {
		return null;
	}
	const fs = nodeLibs.fs.promises;
	const node_path = nodeLibs.node_path;
	path = nodeLibs.path;
	const fileStat = await fs.stat(path).catch(() => null);
	if (fileStat === null) {
		return null;
	}
	async function stat(path: string) {
		const fileStat = await fs.stat(path).catch(() => null);
		if (fileStat === null) {
			return null;
		}
		if (fileStat.isFile()) {
			return { type: "file" as const };
		} else if (fileStat.isDirectory()) {
			return { type: "folder" as const };
		}
		return null;
	}
	const read = (path: string) => fs.readFile(path, "utf-8");
	const list = async (path: string) => {
		const files = await fs.readdir(path);
		return { files: files.map((file) => node_path.join(path, file)) };
	};
	const files = await walkRecursive(path, { stat, list, read });
	return files
}

async function getFilesWithin(vault: Vault, path: string): Promise<File[]> {
	const fileOrFolder = vault.getAbstractFileByPath(path);
	if (fileOrFolder) {
		const files = generateFilesWithin(fileOrFolder);
		return Array.from(files).map((file) => ({
			path: file.path,
			name: file.name,
			read: () => vault.cachedRead(file),
		}));
	}
	const absoluteFiles = await genereteFilesWithinAbsolutePaths(path);
	if (absoluteFiles) {
		return absoluteFiles;
	}
	const hiddenFiles = await generateFilesWithinHidden(vault, path);
	if (hiddenFiles) {
		return hiddenFiles;
	}
	return [];
}

/**
 * Abstraction for a file which can either be a TFile from the vault, a hidden file or a file in a hidden folder 
 * or on desktop only an absolute path to a file outside the vault.
 */
type File = {
	path: string;
	name: string;
	read: () => Promise<string>;
}

interface FileSets {
	definitelyVariableFiles: Set<File>;
	definitelySnippetFiles: Set<File>;
	snippetOrVariableFiles: Set<File>;
}

export async function getFileSets(plugin: LatexSuitePlugin): Promise<FileSets> {
	const variablesFolder =
		plugin.settings.loadSnippetVariablesFromFile
		? await getFilesWithin(plugin.app.vault, plugin.settings.snippetVariablesFileLocation)
		: [];

	const snippetsFolder =
		plugin.settings.loadSnippetsFromFile
		? await getFilesWithin(plugin.app.vault, plugin.settings.snippetsFileLocation)
		: [];
	const variablePathSet = new Set(variablesFolder.map(file => file.path));
	const snippetPathSet = new Set(snippetsFolder.map(file => file.path));	

	const definitelyVariablePaths = difference(variablePathSet, snippetPathSet);
	const definitelyVariableFiles = new Set(variablesFolder.filter(file => definitelyVariablePaths.has(file.path)))

	const definitelySnippetPaths = difference(snippetPathSet, variablePathSet);
	const definitelySnippetFiles = new Set(snippetsFolder.filter(file => definitelySnippetPaths.has(file.path)))

	const snippetOrVariablePaths = intersection(variablePathSet, snippetPathSet);
	const snippetOrVariableFiles = new Set(variablesFolder.filter(file => snippetOrVariablePaths.has(file.path)))

	return {definitelyVariableFiles, definitelySnippetFiles, snippetOrVariableFiles};
}

export async function getVariablesFromFiles(files: FileSets) {
	const snippetVariables: SnippetVariables = {};

	for (const file of files.definitelyVariableFiles) {
		const content = await file.read();
		try {
			Object.assign(snippetVariables, await parseSnippetVariables(content, file.path));
		} catch (e) {
			new Notice(`Failed to parse variable file ${file.name}: ${e}`);
			console.error(`Failed to parse variable file ${file.name}: ${e}`);
			files.definitelyVariableFiles.delete(file);
		}
	}

	return snippetVariables;
}

export async function tryGetVariablesFromUnknownFiles(files: FileSets) {
	const snippetVariables: SnippetVariables = {};

	for (const file of files.snippetOrVariableFiles) {
		const content = await file.read();
		try {
			Object.assign(snippetVariables, await parseSnippetVariables(content, file.path));
			files.definitelyVariableFiles.add(file);
		} catch {
			// No error here, we just assume this is a snippets file.
			// If it's not, then an error will be raised later, while parsing it.
			files.definitelySnippetFiles.add(file);
		}
		files.snippetOrVariableFiles.delete(file);
	}

	return snippetVariables;
}

export async function getSnippetsFromFiles(
	files: FileSets,
	snippetVariables: SnippetVariables
) {
	const snippets: Snippet[] = [];

	for (const file of files.definitelySnippetFiles) {
		const content = await file.read();
		try {
			snippets.push(...await parseSnippets(content, snippetVariables, file.path));
		} catch (e) {
			new Notice(`Failed to parse snippet file ${file.name}: ${e}`);
			console.error(`Failed to parse snippet file ${file.name}: ${e}`);
			files.definitelySnippetFiles.delete(file);
		}
	}

	return sortSnippets(snippets);
}
