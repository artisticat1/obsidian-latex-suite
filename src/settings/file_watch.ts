import LatexSuitePlugin from "../main";
import { Vault, TFile, TFolder, TAbstractFile, Notice, debounce, Platform } from "obsidian";
import { Snippet } from "../snippets/snippets";
import { parseSnippets, parseSnippetVariables, type SnippetVariables } from "../snippets/parse";
import { sortSnippets } from "src/snippets/sort";

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

}, 3000, true);

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
	// eslint-disable-next-line @typescript-eslint/no-require-imports -- inline needed to keep it working on mobile
	const fs = require("fs") as typeof import("fs")
	// eslint-disable-next-line @typescript-eslint/no-require-imports -- inline needed to keep it working on mobile
	const node_path = require("path") as typeof import("path")
	if (path.slice(0, 2) === "~/") {
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- inline needed to keep it working on mobile
		const os = require("os") as typeof import("os")
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

async function* walkRecursive(path: string, fsLike: FsLike): AsyncGenerator<File, void, void> {
	const stat = await fsLike.stat(path);
	if (stat?.type === "file") {
		const name = path.split("/").pop() || path;
		const read = () => fsLike.read(path);
		yield { name, path, read };
	} else if (stat?.type === "folder") {
		const files = await fsLike.list(path);
		// this is intentionally sequential instead of async, otherwise the walk couldn't be stopped.
		// and the safety of not importing a lot of files is more important than speed.
		for (const file of files.files) {
			yield* walkRecursive(file, fsLike);
		}
	}
}

async function* generateFilesWithinHidden(vault: Vault, path: string)  {
	const hiddenFileOrFolder = await vault.adapter.exists(path);
	if (hiddenFileOrFolder === null) {
		return null;
	}
	yield* walkRecursive(path, vault.adapter);
}

async function genereteFilesWithinAbsolutePaths(path: string) {
	if (!Platform.isDesktop) {
		return;
	}
	const nodeLibs = await AbsolutePath(path);
	if (nodeLibs === null) {
		return;
	}
	const fs = nodeLibs.fs.promises;
	const node_path = nodeLibs.node_path;
	path = nodeLibs.path;
	const fileStat = await fs.stat(path).catch(() => null);
	if (fileStat === null) {
		return;
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
	return walkRecursive(path, { stat, list, read });
}

async function* getFilesWithin(vault: Vault, path: string): AsyncGenerator<File> {
	const fileOrFolder = vault.getAbstractFileByPath(path);
	if (fileOrFolder) {
		const files = generateFilesWithin(fileOrFolder);
		for (const file of files) {
			yield {
				path: file.path,
				name: file.name,
				read: () => vault.cachedRead(file),
			}
		}
	}
	const absoluteFiles = await genereteFilesWithinAbsolutePaths(path);
	if (absoluteFiles) {
		yield* absoluteFiles;
	} else {
		yield* generateFilesWithinHidden(vault, path);
	}
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

type FileSetKind = "variable" | "snippet" | "unknown";
type FileSet<T extends FileSetKind = FileSetKind> = {
	kind: T;
	file: File;
};

type SnippetVariableFileGenerator = AsyncGenerator<FileSet, void, void>;

export async function* getSnippetVariableFiles(plugin: LatexSuitePlugin): SnippetVariableFileGenerator {
	if (!plugin.settings.loadSnippetVariablesFromFile) {
		return;
	}
	const variablesFolder = getFilesWithin(
		plugin.app.vault,
		plugin.settings.snippetVariablesFileLocation,
	);
	const snippetFolder = plugin.settings.loadSnippetsFromFile ? plugin.settings.snippetsFileLocation : null;
	const unknownFiles: FileSet<"unknown">[] = [];

	for await (const variableFile of variablesFolder) {
		if (snippetFolder && variableFile.path.startsWith(snippetFolder)) {
			yield {
				kind: "unknown",
				file: variableFile,
			};
			unknownFiles.push({
				kind: "unknown",
				file: variableFile,
			});
		} else {
			yield {
				kind: "variable",
				file: variableFile,
			};
		}
	}
}

export async function* getSnippetFiles(plugin: LatexSuitePlugin) {
	if (!plugin.settings.loadSnippetsFromFile) {
		return;
	}
	const snippetFolder = getFilesWithin(plugin.app.vault, plugin.settings.snippetsFileLocation)
	const variableFolder = plugin.settings.loadSnippetVariablesFromFile ? plugin.settings.snippetVariablesFileLocation : null;

	for await (const snippetFile of snippetFolder) {
		if (variableFolder && snippetFile.path.startsWith(variableFolder)) {
			continue;
		} else {
			yield {
				kind: "snippet",
				file: snippetFile,
			} as const;
		}
	}
}

class NoticeManager {
	notices: Notice[] = [];
	addNotice(notice: Notice) {
		this.notices.push(notice);
		// Too many notices are just spammy, that the console should be read used instead.
		// or fix the errors one by one.
		if (this.notices.length > 4) {
			const first = this.notices.shift();
			first?.hide();
		}
	}
	
	clearNotices() {
		for (const notice of this.notices) {
			notice.hide();
		}
		this.notices = [];
	}
}
const noticeManager = new NoticeManager();
const MAX_FAILURES = 50;

function isMaxFailuresReached(failures: number, kind: "snippet variables" | "snippets") {
	if (failures >= MAX_FAILURES) {
		const message = `Too many failures (${failures}) while parsing snippet/variable files. Further parsing will be stopped and loading from files for ${kind} will be  turned off.`
		const notice = new Notice(message);
		noticeManager.clearNotices();
		noticeManager.addNotice(notice);
		console.error(message);
		return true;
	}
	return false;
}

export async function getVariablesFromFiles(files: SnippetVariableFileGenerator) {
	const snippetVariables: SnippetVariables = {};
	const unknownFiles: FileSet[] = [];
	let failures = 0;

	for await (const fileSet of files) {
		if (!["variable", "unknown"].includes(fileSet.kind)) {
			continue;
		}
		const file = fileSet.file;
		const content = await file.read();
		try {
			Object.assign(snippetVariables, await parseSnippetVariables(content, file.path));
		} catch (err) {
			// if the file is unknown, it might be a snippet file so we skip it.
			if (fileSet.kind === "unknown") {
				unknownFiles.push(fileSet);
				continue;
			}
			const e = err as Error;
			const notice = new Notice(`Failed to parse variable file ${file.name}: ${e}`);
			noticeManager.addNotice(notice);
			console.error(`Failed to parse variable file ${file.name}: ${e}`);
			failures++;
			if (isMaxFailuresReached(failures, "snippet variables")) {
				return null;
			}
		}
	}

	return {
		snippetVariables,
		failures,
		unknownFiles
	}
}

export async function getSnippetsFromFiles(
	files: AsyncIterable<FileSet>,
	snippetVariables: SnippetVariables,
	failures: number,
) {
	const snippets: Snippet[] = [];

	for await (const {file} of files) {
		const content = await file.read();
		try {
			snippets.push(...await parseSnippets(content, snippetVariables, file.path));
		} catch (err) {
			const e = err as Error;
			const notice = new Notice(`Failed to parse snippet file ${file.name}: ${e}`);
			noticeManager.addNotice(notice);
			console.error(`Failed to parse snippet file ${file.name}: ${e}`);
			failures++;
			if (isMaxFailuresReached(failures, "snippets")) {
				return null;
			}
		}
	}

	return sortSnippets(snippets);
}
