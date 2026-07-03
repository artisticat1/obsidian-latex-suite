import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { SyntaxNode } from "@lezer/common";
import { modifiedSyntaxTree } from "./language";
import { fullMathParser } from "./mathjax-parser";

export const mathParserPlugin = ViewPlugin.fromClass(
	class {
		update(update: ViewUpdate) {
			if (!update.docChanged) return;
			try {
				// const tree = modifiedSyntaxTree(update.state);
				const docString = update.state.doc.toString();
				console.log(docString)
				const tree = fullMathParser.parse(docString);
				_printNode2(tree.topNode, docString);
			} catch (e) {
				console.error(e)
			}
		}
	},
);
export function _printNode2(node: SyntaxNode, docString: string) {
	const result: {
		name: string; id: number; from: number; to: number; indent: number;
	}[] = [
		// {
		// 	name: node.name,
		// 	id: node.type.id,
		// 	from: node.from,
		// 	to: node.to,
		// 	indent: 0,
		// },
	];
	function walk(node: SyntaxNode, indent: number) {
		let child = node.firstChild;
		while (child) {
			result.push({
				name: child.name,
				id: child.type.id,
				from: child.from,
				to: child.to,
				indent,
			});
			walk(child, indent + 1);
			child = child.nextSibling;
		}
	}
	walk(node, 1)	
	console.debug(
		result
			.map(
				({ name, from, to, indent, id }) =>
					`${"  ".repeat(indent)}${name}: (${from}, ${to}): `
				//  + docString.slice(from, to) 
				 ,
			)
			.join("\n"),
	);
}
