import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { IterMode, SyntaxNode, Tree } from "@lezer/common";
import { modifiedSyntaxTree } from "./language";
import { fullMathParser } from "./mathjax-parser";

export const mathParserPlugin = ViewPlugin.fromClass(
	class {
		update(update: ViewUpdate) {
			if (!update.docChanged) return;
			try {
				const tree = modifiedSyntaxTree(update.state);
				const docString = update.state.doc.toString();
				_printNode2(tree.topNode, docString);
			} catch (e) {
				console.error(e)
			}
		}
	},
);
export function _printNode2(node: SyntaxNode, docString: string) {
	const result: {
		name: string; from: number; to: number; indent: number;
	}[] = [
		// {
		// 	name: node.name,
		// 	id: node.type.id,
		// 	from: node.from,
		// 	to: node.to,
		// 	indent: 0,
		// },
	];
	function push_node(node: SyntaxNode, base_indent: number=0) {
		const {name, from, to} = node;
		let indent = base_indent;
		let parent: SyntaxNode | null = node.node
		while ((parent = parent.parent)){
			indent++
		}
		result.push(
			{name,from,to,indent}
		)
	}
	function walk(node: SyntaxNode) {
		let child = node.firstChild
		while (child) {
			push_node(child)
			walk(child)
			child = child.nextSibling
		}
	}
	walk(node)
	// tree.iterate({
	// 	enter: (node) => {
	// 		push_node(node.node)
	// 		if (node.name === "DisplayMath"){
	// 			const enter_node=node.node.enter((node.node.from + node.node.to)/2, 1, IterMode.IncludeAnonymous)
	// 			console.debug(enter_node)
	// 			if (enter_node) walk(enter_node)
	// 		}
	// 	}
	// })

	console.debug(
		result
			.map(
				({ name, from, to, indent }) =>
					`${"  ".repeat(indent)}${name}: (${from}, ${to}): `
				 // + docString.slice(from, to)
				 ,
			)
			.join("\n"),
	);
}
