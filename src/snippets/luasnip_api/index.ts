import { SnippetVariables } from "../parse";
import { TabstopNode, TextNode } from "./node";

// For now SnippetNode, VisualSnippetNode and ArrayNode remain internal api only,
// as I am not sure how bug proof it would be/how intuitif.
// And its not really needed as they are just shortcuts of using tabstop and text nodes + a function.

function tabstop_node(index: number, insert: string = "") {
	return new TabstopNode(index, insert);
}

function text_node(text: string) {
	return new TextNode(text)
}

export const api = (snippetVariables: SnippetVariables) => {
	return {
		snippetVariables,
		tabstop_node,
		text_node
	}
}
