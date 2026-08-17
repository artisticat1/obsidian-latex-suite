// Credits to https://github.com/liamcain/obsidian-periodic-notes

import { AbstractInputSuggest, App, requireApiVersion, TAbstractFile, Vault } from "obsidian";

import { TextInputSuggest } from "./suggest";

function createFileSuggest() {
	function getSuggestions(app: App, inputStr: string): TAbstractFile[] {

		const files: TAbstractFile[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		Vault.recurseChildren(app.vault.getRoot(), (file) => {
			if (file.path.toLowerCase().contains(lowerCaseInputStr)) {
				files.push(file);
			}
		});

		return files;
	}

	function renderSuggestion(file: TAbstractFile, el: HTMLElement): void {
		el.setText(file.path);
	}
	if (requireApiVersion("1.4.10")) {
		return class FileSuggest extends AbstractInputSuggest<TAbstractFile> {
			getSuggestions(query: string) {
				return getSuggestions(this.app, query)			
			}	

			renderSuggestion(file: TAbstractFile, el: HTMLElement): void {
				return renderSuggestion(file, el)
			}
		}
	} else {
		return class FileSuggest extends TextInputSuggest<TAbstractFile> {
			getSuggestions(inputStr: string): TAbstractFile[] {
				return getSuggestions(this.app, inputStr)
			}

			renderSuggestion(file: TAbstractFile, el: HTMLElement): void {
				return renderSuggestion(file, el)
			}

			selectSuggestion(file: TAbstractFile): void {
				this.inputEl.value = file.path;
				this.inputEl.trigger("input");
				this.close();
			}
		}
	}

}

export const FileSuggest = createFileSuggest()
