// Credits to https://github.com/liamcain/obsidian-periodic-notes

import { TFile } from "obsidian";

import { TextInputSuggest } from "./suggest";

export class FileSuggest extends TextInputSuggest<TFile> {
  getSuggestions(inputStr: string): TFile[] {

    const filesInVault = this.app.vault.getFiles();
    const files: TFile[] = [];
    const lowerCaseInputStr = inputStr.toLowerCase();

    filesInVault.forEach((file: TFile) => {
      if (file.path.toLowerCase().contains(lowerCaseInputStr)) {
        files.push(file);
      }
    });

    return files;
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.setText(file.path);
  }

  selectSuggestion(file: TFile): void {
    this.inputEl.value = file.path;
    this.inputEl.trigger("input");
    this.close();
  }
}