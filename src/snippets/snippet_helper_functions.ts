import { Snippet } from "./snippets";
import { TFile, TFolder } from "obsidian";

import { invertedEffects } from "@codemirror/commands";
import { addMark, removeMark, startSnippet, undidStartSnippet, endSnippet, undidEndSnippet } from "./marker_state_field";


export function sortSnippets(snippets:Snippet[]) {
    // Sort snippets in order of priority

    function compare( a:Snippet, b:Snippet ) {
        const aPriority = a.priority === undefined ? 0 : a.priority;
        const bPriority = b.priority === undefined ? 0 : b.priority;

        if ( aPriority < bPriority ){
            return 1;
        }
        if ( aPriority > bPriority ){
            return -1;
        }
        return 0;
    }

    snippets.sort(compare);
}



export function validateSnippets(snippets: Snippet[]):boolean {
    let valid = true;

    for (const snippet of snippets) {
        // Check that the snippet trigger, replacement and options are defined

        if (!(snippet.trigger && snippet.replacement && snippet.options != undefined)) {
            valid = false;
            break;
        }
    }

    return valid;
}


export function isInFolder(file: TFile, dir: TFolder) {

    let cur = file.parent;

    while (!cur.isRoot) {
        if (cur.path === dir.path) return true;
        
        cur = cur.parent;
    }

    return false;
}


// Enables undoing and redoing snippets, taking care of the tabstops
export const snippetInvertedEffects = invertedEffects.of(tr => {
    const effects = [];

    for (const effect of tr.effects) {
        if (effect.is(addMark)) {
            effects.push(removeMark.of(effect.value));
        }
        else if (effect.is(removeMark)) {
            effects.push(addMark.of(effect.value));
        }

        else if (effect.is(startSnippet)) {
            effects.push(undidStartSnippet.of(null));
        }
        else if (effect.is(undidStartSnippet)) {
            effects.push(startSnippet.of(null));
        }
        else if (effect.is(endSnippet)) {
            effects.push(undidEndSnippet.of(null));
        }
        else if (effect.is(undidEndSnippet)) {
            effects.push(endSnippet.of(null));
        }
    }


    return effects;
});
