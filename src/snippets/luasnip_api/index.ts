import { SnippetVariables } from "../parse";
import { ArrayNode, BaseNode, SnippetNode, TabstopNode, TextNode } from "./node";


function array_node(nodes: BaseNode[]) {
	return new ArrayNode(nodes)
}

function tabstop_node(index: number, insert: string = "") {
	return new TabstopNode(index, insert);
}

function snippet_node(snippet: string) {
	return new SnippetNode(snippet)
}

function text_node(text: string) {
	return new TextNode(text)
}

export const api = (snippetVariables: SnippetVariables) => {
	return {
		snippetVariables: snippetVariables,
		array_node,
		tabstop_node,
		snippet_node,
		text_node
	}
}
