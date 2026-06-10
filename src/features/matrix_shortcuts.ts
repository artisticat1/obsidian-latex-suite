import { EditorView } from "@codemirror/view";
import { setCursor } from "src/utils/editor_utils";
import { getLatexSuiteConfig } from "src/snippets/codemirror/config";
import { Bounds, getContextPlugin } from "src/utils/context";
import { queueSnippet } from "src/snippets/codemirror/snippet_queue_state_field";
import { expandSnippets } from "src/snippets/snippet_management";
import { taboutByEnclosedBrackets } from "./tabout";
import { ArrayNode, emptyInsertOptions, TabstopNode, TextNode } from "src/snippets/luasnip_api/node";
import { parser } from "src/parser/latex-parser.js";
import { NodeIterator, SyntaxNode, Tree } from "@lezer/common";

const newlineMatrixShortcutCallback = (view: EditorView): boolean => {
	const ctx = getContextPlugin(view);
	const cur_line = view.state.doc.lineAt(ctx.pos);
	const current_matrix_line = cur_line.text.match(/(\\begin{[^]]*}|\\\\|^)((?:\s|&)+)/);
	const added_cells = current_matrix_line?.[2].trimStart() ?? ""
	if (ctx.mode.blockMath) {
		const snippet = new ArrayNode([new TextNode(" \\\\\n" + added_cells), new TabstopNode(0,"")]);
		// Keep current indentation and callout characters
		queueSnippet(view, ctx.pos, ctx.pos, snippet.applyInsert(emptyInsertOptions));
		expandSnippets(view);
	} else {
		view.dispatch(view.state.replaceSelection(` \\\\  ${added_cells}`));
	}
	return true;
};

const taboutMatrixShortcutCallback = (view: EditorView, bounds: Bounds): boolean => {
	const ctx = getContextPlugin(view);
	if (ctx.mode.blockMath) {
		// Move cursor to end of next line
		const d = view.state.doc;

		const nextLineNo = d.lineAt(ctx.pos).number + 1;
		const nextLine = d.line(nextLineNo);
		const nextLineText = nextLine.text;
		const potentialEndMatrix = /\\end{([^}]*)}/.exec(nextLineText)

		let to = nextLine.to;
		if (potentialEndMatrix && potentialEndMatrix[1] && potentialEndMatrix.index !== undefined) {
			const envName = potentialEndMatrix[1];
			const settingsEnvNames = getLatexSuiteConfig(view).matrixShortcutsEnvNames;
			if (settingsEnvNames.includes(envName)) {
				to = nextLine.from + potentialEndMatrix.index + potentialEndMatrix[0].length;
			}
		}

		setCursor(view, to);
	}
	else if (ctx.mode.inlineMath) {
		setCursor(view, bounds.outer_end);
	}	
	return true;
}

const addCellMatrixShortcutCallback = (view: EditorView): boolean => {
	if (!view.state.selection.main.empty) {
		return false;
	}
	view.dispatch(view.state.replaceSelection(" & "));
	return true;
}

function getEnvName(tree: Tree, pos: number, doc: string): StackOutput | null {
	let stack: NodeIterator | null = tree.resolveStack(pos, 0)
	while (stack) {
		const node = stack.node
		stack = stack.next;
		const res = getEnvNameFromNode(node, doc)
		if (!res) {
			continue
		}
		return res
	}
	return null
}

// for debugging the tree
function _printNode(node: SyntaxNode, doc: string) {
	const result = [
		{
			name: node.name,
			id: node.type.id,
			from: node.from,
			to: node.to,
			indent: 0,
		},
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
		result.map(
			({ name, from, to, indent, id }) =>
				`${"  ".repeat(indent)}${name}: ${id}(${from}, ${to}): ` + JSON.stringify(doc.slice(from, to))
		).join("\n")
	);
}

type StackOutput = (
	| {
			kind: "command";
	  }
	| {
			kind: "environment";
	  }
) & {
	name: string;
} & Bounds

/**
 * See latex.grammar for reference of the the nodes structure
 * tries to get the name of the current environment/macro
 * and finds the inner bounds of the environment/macro argument and the end of the environment/macro.
 */
function getEnvNameFromNode(node: SyntaxNode, doc: string): null | StackOutput {
	const value = node.name
	function createEnvironment(envNode: SyntaxNode | null): null | StackOutput {
		const beginNode = envNode?.getChild("BeginEnv")
		const envNameNode = beginNode?.getChild("EnvNameGroup")
		const contentNode = envNode?.getChild("Content")
		if (!envNameNode || !contentNode || !envNode) {
			return null
		}
		return {
			kind: "environment",
			name: doc.slice(envNameNode.from + 1, envNameNode.to - 1),
			inner_start: contentNode.from,
			inner_end: contentNode.to,
			outer_start: envNode.from,
			outer_end: envNode.to
		}
	}
	
	if (value === "Environment") {
		return createEnvironment(node)
	} else if (value === "KnownEnvironment") {
		return createEnvironment(node.firstChild)
	} else if (value.endsWith("Argument")) {
		const parent = node.parent
		const command = parent?.firstChild
		const openBraced = node?.firstChild
		const closeBraced = node?.lastChild
		if (!command || !openBraced || !closeBraced) {
			return null
		}
		return {
			kind: "command",
			name: doc.slice(command.from + 1, command.to),
			inner_start: openBraced.to,
			inner_end: closeBraced.from,
			outer_start: node.from,
			outer_end: closeBraced.to,
		}
	}
	return null
}

const matrixShortcutsRunner = (shortcut: (view: EditorView, bounds?: Bounds) => boolean) => (view: EditorView): boolean => {
	const ctx = getContextPlugin(view);
	if (!ctx.mode.strictlyInMath()) return false;
	const bounds = ctx.getBounds();
	if (!bounds) return false;
	const equation = view.state.sliceDoc(bounds.inner_start, bounds.inner_end);
	const tree: Tree = parser.parse(equation);
	const envName = getEnvName(tree, ctx.pos - bounds.inner_start, equation);
	if (!envName) return false;

	const settings = getLatexSuiteConfig(view);
	if (envName.kind === "environment" && !settings.matrixShortcutsEnvNames.includes(envName.name)) {
		return false;
	} else if (envName.kind === "command" && !settings.matrixShortcutsMacroNames.includes(envName.name)) {
		return false;
	}
	return shortcut(view, envName);
}

const priorityTaboutShortcutCallback = (view: EditorView): boolean => {
	const ctx = getContextPlugin(view);
	const currentLine = view.state.doc.lineAt(ctx.pos);
	const currentLineText = currentLine.text.slice(ctx.pos - currentLine.from);
	const bracketEnd = taboutByEnclosedBrackets(view, currentLineText);
	if (bracketEnd !== null) {
		setCursor(view, ctx.pos + bracketEnd);
		return true;
	}
	return false;
}

export const newlineMatrixShortcut = matrixShortcutsRunner(newlineMatrixShortcutCallback);
export const exitMatrixShortCut = matrixShortcutsRunner(taboutMatrixShortcutCallback);
export const addCellMatrixShortcut = matrixShortcutsRunner(addCellMatrixShortcutCallback);
export const priorityTaboutMatrixShortcut = matrixShortcutsRunner(priorityTaboutShortcutCallback);
