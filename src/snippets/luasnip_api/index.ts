import { SnippetVariables } from "../parse";
import { CaptureNode, TabstopNode, TextNode } from "./node";

// For now SnippetNode, VisualSnippetNode and ArrayNode remain internal api only,
// as I am not sure how bug proof it would be/how intuitif.
// And its not really needed as they are just shortcuts of using tabstop and text nodes + a function.

function tabstop_node(index: number, insert: string = "") {
	return new TabstopNode(index, insert);
}

function text_node(text: string) {
	return new TextNode(text)
}

/**
 * Creates a node that inserts the text captured by a regex group. ${VISUAL} is reserved for visual snippets. 
 * @param captureName key or number
 * @returns node that inserts the captured node
 */
function capture_node(captureName: string | number) {
	return new CaptureNode(captureName);
}

export const api = (snippetVariables: SnippetVariables) => {
	return {
		snippetVariables,
		tabstop_node,
		text_node,
		capture_node,
	}
}
