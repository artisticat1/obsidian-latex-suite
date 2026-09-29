import { type PluginValue, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { NodeProp, type SyntaxNode } from "@lezer/common";
import { modifiedSyntaxTree } from "./language";
import { fullMathParser } from "./mathjax-parser";
import { EditorState } from "@codemirror/state";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { isLogLevelEnabled } from "src/settings/settings";

class SyntaxTreePrinter implements PluginValue {
	mountedTreeInfo: string[] = [];
	treeInfo: string = "";
	update(update: ViewUpdate) {
		if (!update.docChanged) return;
		const settings = getLatexSuiteConfig(update.view);
		if (!isLogLevelEnabled(settings.logLevel, "verbose")) {
			return;
		}
		try {
			this.mountedTreeInfo = this.printMountedTrees(update.state);
			const tree = modifiedSyntaxTree(update.state);
			console.debug("Syntax Tree:", tree.toString());
			const docString = update.state.doc.toString();
			this.treeInfo = _getNodeInfo(tree.topNode, docString);
			if (isLogLevelEnabled(settings.logLevel, "vverbose")) {
				console.debug("Full Syntax Tree:\n", this.treeInfo);
				console.debug("Mounted Trees:\n", this.mountedTreeInfo.join("\n"));
			}
		} catch (e) {
			console.error(e);
		}
	}

	printMountedTrees(state: EditorState) {
		// const tree = modifiedSyntaxTree(state);
		const tree= fullMathParser([]).parse(state.doc.toString())
		const mountedTrees: SyntaxNode[] = this.getmountedTrees(tree.topNode);
		
	
	
		const equation = state.doc.sliceString(0, state.doc.length);
		return mountedTrees.map((node) => _getNodeInfo(node, equation));
	}

	private getmountedTrees(node: SyntaxNode): SyntaxNode[] {
		const mountedTrees: SyntaxNode[] = [];
		node.cursor().iterate((node) => {
			const tree = node.node.tree?.prop(NodeProp.mounted);
			const overlay = tree?.overlay
			if (tree && overlay) {
				const treeEnter = node.node.enter(overlay[overlay.length - 1].to, -1);
				if (treeEnter) {
					mountedTrees.push(treeEnter);
					mountedTrees.push(...this.getmountedTrees(treeEnter));
				}
			}
		});
		return mountedTrees;
	}
}

export const mathParserPlugin = ViewPlugin.fromClass(SyntaxTreePrinter);

export function _getNodeInfo(node: SyntaxNode, docString: string) {
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

	return result
		.map(
			({ name, from, to, indent }) =>
				`${"  ".repeat(indent)}${name}: (${from}, ${to}): ` +
				docString.slice(from, to).replace(/\n/g, "\\n"),
		)
		.join("\n");
}
