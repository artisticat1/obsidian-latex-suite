import LatexSuitePlugin from "../main";
import { TFile, TFolder, Notice, debounce, TAbstractFile } from "obsidian";
import { Snippet } from "./snippets";
import { getSnippetsFromString, sortSnippets } from "./snippet_helper_functions";


export async function onFileChange(plugin: LatexSuitePlugin, file: TAbstractFile) {

    if (!(plugin.settings.loadSnippetsFromFile)) return;
    if (!(file instanceof TFile)) return;
    
    if (file.path === plugin.settings.snippetsFileLocation || fileIsInSnippetsFolder(plugin, file)) {
        try {
            await debouncedSetSnippetsFromFileOrFolder(plugin);
        }
        catch {
            new Notice("Failed to load snippets.", 5000);
        }
    }
}


export const onFileCreate = (plugin: LatexSuitePlugin, file:TAbstractFile) => {
    if (!(plugin.settings.loadSnippetsFromFile)) return;
    
    if (file instanceof TFile && fileIsInSnippetsFolder(plugin, file)) {
        debouncedSetSnippetsFromFileOrFolder(plugin);
    }
}


export const onFileDelete = (plugin: LatexSuitePlugin, file:TAbstractFile) => {
    if (!(plugin.settings.loadSnippetsFromFile)) return;
    
    const snippetDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.snippetsFileLocation);
    const isFolder = snippetDir instanceof TFolder;

    if (file instanceof TFile && (isFolder && file.path.contains(snippetDir.path))) {
        debouncedSetSnippetsFromFileOrFolder(plugin);
    }
}


export async function getSnippetsWithinFolder(folder: TFolder) {
    const snippets:Snippet[] = [];
    
    for (const fileOrFolder of folder.children) {
        if (fileOrFolder instanceof TFile) {

            const content = await this.app.vault.cachedRead(fileOrFolder as TFile);

            try {
                snippets.push(...getSnippetsFromString(content));
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


export function isInFolder(file: TFile, dir: TFolder) {
    
    let cur = file.parent;
    let cnt = 0;
    
    while (cur && (!cur.isRoot()) && (cnt < 100)) {

        if (cur.path === dir.path) return true;
        
        cur = cur.parent;
        cnt++;
    }
    
    return false;
}


export const fileIsInSnippetsFolder = (plugin: LatexSuitePlugin, file: TFile) => {
    const snippetDir = plugin.app.vault.getAbstractFileByPath(plugin.settings.snippetsFileLocation);
    const isFolder = snippetDir instanceof TFolder;
    
    return (isFolder && isInFolder(file, snippetDir));
}


export const debouncedSetSnippetsFromFileOrFolder = debounce(async (plugin: LatexSuitePlugin, path?: string) => {
    
    if (!(plugin.settings.loadSnippetsFromFile)) return;
    if (!path) path = plugin.settings.snippetsFileLocation;
    
    let snippets:Snippet[];
    const fileOrFolder = plugin.app.vault.getAbstractFileByPath(path);


    if (fileOrFolder instanceof TFolder) {
        snippets = await getSnippetsWithinFolder(fileOrFolder as TFolder);
        
    } else {
        const content = await plugin.app.vault.cachedRead(fileOrFolder as TFile);
        snippets = await getSnippetsFromString(content);
    }
    

    // Sorting needs to happen after all the snippet files have been parsed
    sortSnippets(snippets);
    plugin.snippets = snippets;

    new Notice("Successfully reloaded snippets.", 5000);

}, 500, true);
