import { snippetInvertedEffects } from "./history";
import { snippetQueuePlugin } from "./snippet_queue_state_field";
import { tabstopsStateField } from "./tabstops_state_field";

export const snippetExtensions = [
    tabstopsStateField.extension,
	snippetQueuePlugin.extension,
    snippetInvertedEffects
];
