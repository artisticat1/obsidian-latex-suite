import { EditorView } from "@codemirror/view";
import { SelectionRange } from "@codemirror/state";
import { isInsideEnvironment, isWithinInlineEquation } from "src/editor_helpers";
import { queueSnippet } from "src/snippets/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { Snippet, SNIPPET_VARIABLES, EXCLUSIONS } from "src/snippets/snippets";
import { autoEnlargeBrackets } from "./auto_enlarge_brackets";
import LatexSuitePlugin from "src/main";


export const runSnippets = (view: EditorView, key: string, withinMath: boolean, ranges: SelectionRange[], plugin: LatexSuitePlugin):boolean => {

    let shouldAutoEnlargeBrackets = false;

    for (const range of ranges) {
        const result = runSnippetCursor(view, key, withinMath, range, plugin);

        if (result.shouldAutoEnlargeBrackets) shouldAutoEnlargeBrackets = true;
    }

    const success = expandSnippets(view);


    if (shouldAutoEnlargeBrackets) {
        autoEnlargeBrackets(view, plugin);
    }

    return success;
}


export const runSnippetCursor = (view: EditorView, key: string, withinMath: boolean, range: SelectionRange, plugin: LatexSuitePlugin):{success: boolean; shouldAutoEnlargeBrackets: boolean} => {

    const {from, to} = range;
    const sel = view.state.sliceDoc(from, to);


    for (const snippet of plugin.snippets) {

        let effectiveLine = view.state.sliceDoc(0, to);

        if (snippet.options.contains("m") && (!withinMath)) {
            continue;
        }
        else if (snippet.options.contains("t") && (withinMath)) {
            continue;
        }

        if (snippet.options.contains("A") || snippet.replacement.contains("${VISUAL}")) {
            // If the key pressed wasn't a text character, continue
            if (!(key.length === 1)) continue;

            effectiveLine += key;
        }
        else if (!(key === "Tab")) {
            // The snippet must be triggered by the Tab key
            continue;
        }

        // Check that this snippet is not excluded in a certain environment
        if (snippet.trigger in EXCLUSIONS) {
            const environment = EXCLUSIONS[snippet.trigger];

            if (isInsideEnvironment(view, to, environment)) continue;
        }


        const result = checkSnippet(snippet, effectiveLine, range, sel);
        if (result === null) continue;
        const triggerPos = result.triggerPos;


        if (snippet.options.contains("w")) {
            // Check that the trigger is preceded and followed by a word delimiter

            const prevChar = view.state.sliceDoc(triggerPos-1, triggerPos);
            const nextChar = view.state.sliceDoc(to, to+1);

            const wordDelimiters = plugin.settings.wordDelimiters.replace("\\n", "\n");


            const prevCharIsWordDelimiter = wordDelimiters.contains(prevChar);
            const nextCharIsWordDelimiter = wordDelimiters.contains(nextChar);

            if (!(prevCharIsWordDelimiter && nextCharIsWordDelimiter)) {
                continue;
            }
        }

        let replacement = result.replacement;


        // When in inline math, remove any spaces at the end of the replacement
        if (withinMath && plugin.settings.removeSnippetWhitespace) {
            let spaceIndex = 0;
            if (replacement.endsWith(" ")) {
                spaceIndex = -1;
            }
            else {
                const lastThreeChars = replacement.slice(-3);
                const lastChar = lastThreeChars.slice(-1);

                if (lastThreeChars.slice(0, 2) === " $" && !isNaN(parseInt(lastChar))) {
                    spaceIndex = -3;
                }
            }

            if (spaceIndex != 0) {

                const inlineMath = isWithinInlineEquation(view.state);

                if (inlineMath) {
                    if (spaceIndex === -1) {
                        replacement = replacement.trimEnd();
                    }
                    else if (spaceIndex === -3){
                        replacement = replacement.slice(0, -3) + replacement.slice(-2)
                    }
                }
            }

        }

        // Expand the snippet
        const start = triggerPos;
        queueSnippet(view, {from: start, to: to, insert: replacement, keyPressed: key});


        const containsTrigger = plugin.autoEnlargeBracketsTriggers.some(word => replacement.contains("\\" + word));
        return {success: true, shouldAutoEnlargeBrackets: containsTrigger};
    }


    return {success: false, shouldAutoEnlargeBrackets: false};
}



export const checkSnippet = (snippet: Snippet, effectiveLine: string, range:  SelectionRange, sel: string):{triggerPos: number; replacement: string} => {
    let triggerPos;
    let trigger = snippet.trigger;
    trigger = insertSnippetVariables(trigger);

    let replacement = snippet.replacement;


    if (snippet.replacement.contains("${VISUAL}")) {
        // "Visual" snippets
        if (!sel) return null;

        // Check whether the trigger text was typed
        if (!(effectiveLine.slice(-trigger.length) === trigger)) return null;


        triggerPos = range.from;
        replacement = snippet.replacement.replace("${VISUAL}", sel);

    }
    else if (sel) {
        // Don't run non-visual snippets when there is a selection
        return null;
    }
    else if (!(snippet.options.contains("r"))) {

        // Check whether the trigger text was typed
        if (!(effectiveLine.slice(-trigger.length) === trigger)) return null;

        triggerPos = effectiveLine.length - trigger.length;

    }
    else {
        // Regex snippet

        // Add $ to match the end of the string
        // i.e. look for a match at the cursor's current position
        const regex = new RegExp(trigger + "$");
        const result = regex.exec(effectiveLine);

        if (!(result)) {
            return null;
        }

        // Compute the replacement string
        // result.length - 1 = the number of capturing groups

        for (let i = 1; i < result.length; i++) {
            // i-1 to start from 0
            replacement = replacement.replaceAll("[[" + (i-1) + "]]", result[i]);
        }

        triggerPos = result.index;
    }

    return {triggerPos: triggerPos, replacement: replacement};
}


export const insertSnippetVariables = (trigger: string) => {

    for (const [variable, replacement] of Object.entries(SNIPPET_VARIABLES)) {
        trigger = trigger.replace(variable, replacement);
    }

    return trigger;
}