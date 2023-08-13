import { snippetInvertedEffects } from "./history";
import { markerStateField } from "./marker_state_field";
import { tabstopsStateField } from "./tabstops_state_field";
import { snippetQueueStateField } from "./snippet_queue_state_field";
import { cursorTriggerStateField } from "./cursor_trigger_state_field";

export const snippetExtensions = [
    markerStateField.extension,
    tabstopsStateField.extension,
    snippetQueueStateField.extension,
    cursorTriggerStateField.extension,
    snippetInvertedEffects
];