/* eslint-disable obsidianmd/rule-custom-message */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { IterMode, MountedTree, NodeProp, SyntaxNode, Tree } from "@lezer/common";
import { modifiedSyntaxTree } from "./language";
import { fullMathParser } from "./mathjax-parser";
import { EditorState } from "@codemirror/state";

export const mathParserPlugin = ViewPlugin.fromClass(
	class {
		update(update: ViewUpdate) {
			if (!update.docChanged) return;
			try {
				this.printMountedTrees(update.state)
				return;
				const tree = modifiedSyntaxTree(update.state);
				const docString = update.state.doc.toString();
				_printNode2(tree.topNode, docString);
			} catch (e) {
				console.error(e)
			}
		}
		
		printMountedTrees(state: EditorState) {
			const tree = modifiedSyntaxTree(state);
			const mountedTrees: SyntaxNode[] = []
			tree.iterate({
				enter: (node) => {
					const mounted = node.type.prop(NodeProp.mounted)
					if (mounted) {
						mountedTrees.push(node.node)
					}
				}
			})	
			mountedTrees.forEach((node) => {
				const tree = node.prop(NodeProp.mounted) as MountedTree
				const equation = state.doc.sliceString(0, state.doc.length)
				const latexnode = node.enter(tree.overlay!.last().to, -1)!
				console.log(latexnode.name)
				_printNode2(node.enter(tree.overlay!.last().to, -1)!, equation)
			})
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
	walk({firstChild: node, nextSibling: null} as SyntaxNode)
	// tree.iterate({
	// 	enter: (node) => {
	// 		push_node(node.node)
	// 		if (node.name === "DisplayMath"){
	// 			const enter_node=node.node.enter((node.node.from + node.node.to)/2, 1, IterMode.IncludeAnonymous)
	// 			console.log(enter_node)
	// 			if (enter_node) walk(enter_node)
	// 		}
	// 	}
	// })

	console.log(
		result
			.map(
				({ name, from, to, indent }) =>
					`${"  ".repeat(indent)}${name}: (${from}, ${to}): `
				 + docString.slice(from, to).replace(/\n/g, "\\n")
				 ,
			)
			.join("\n"),
	);
}
