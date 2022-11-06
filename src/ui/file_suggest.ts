// Credits to https://github.com/liamcain/obsidian-periodic-notes

import { TAbstractFile, Vault } from "obsidian";

import { TextInputSuggest } from "./suggest";

export class FileSuggest extends TextInputSuggest<TAbstractFile> {
  getSuggestions(inputStr: string): TAbstractFile[] {

    const files: TAbstractFile[] = [];
    const lowerCaseInputStr = inputStr.toLowerCase();

    Vault.recurseChildren(this.app.vault.getRoot(), (file) => {
      if (file.path.toLowerCase().contains(lowerCaseInputStr)) {
        files.push(file);
      }
    });

    return files;
  }

  renderSuggestion(file: TAbstractFile, el: HTMLElement): void {
    el.setText(file.path);
  }

  selectSuggestion(file: TAbstractFile): void {
    this.inputEl.value = file.path;
    this.inputEl.trigger("input");
    this.close();
  }
}
