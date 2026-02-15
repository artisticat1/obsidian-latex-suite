import { snippetInvertedEffects } from "./history";
import { tabstopsStateField } from "./tabstops_state_field";

export const snippetExtensions = [
    tabstopsStateField.extension,
    snippetInvertedEffects
];
