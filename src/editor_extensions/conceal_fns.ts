import { EditorView } from "@codemirror/view";
import { getMathBoundsPlugin } from "src/utils/context";
import { ConcealSpec } from "./conceal";
import {
	fractions,
	not_remap as raw_not_remap,
	brackets,
	mathscrcal,
	greek,
	mathbb,
	operators,
	cmd_symbols,
	leftrightBrackets,
} from "./conceal_maps";
import { SyntaxNode, TreeCursor } from "@lezer/common";
import * as latex from "src/parser/mathjax/latex-parser.terms";
import { cumulativeSum } from "src/utils/editor_utils";
import { EquationText, iterateTreeCursor } from "src/utils/tokenizer";

const ALL_SYMBOLS: Record<string, string> = Object.fromEntries(
	Object.entries({ ...greek, ...cmd_symbols }).sort(
		(a, b) => b[0].length - a[0].length,
	),
);
const not_remap: Record<string, string> = Object.fromEntries([
	...Object.entries(raw_not_remap).sort((a, b) => b[0].length - a[0].length),
]);

const textModifiers = {
	mathbf: "cm-concealed-bold",
	boldsymbol: "cm-concealed-bold",
	underline: "cm-concealed-underline",
	mathrm: "cm-concealed-mathrm",
	mathbb: undefined,
} satisfies Record<string, string | undefined>;

const modifiers = {
	hat: "\u0302",
	dot: "\u0307",
	ddot: "\u0308",
	overline: "\u0304",
	bar: "\u0304",
	tilde: "\u0303",
	vec: "\u20D7",
} satisfies Record<string, string>;

enum HandleResultKind {
	NotHandled,
	Handled,
}

type HandleConcealResult = {
	spec: ConcealSpec;
	kind: HandleResultKind;
};

function extractMathArgument(node: SyntaxNode) {
	const mathArgumentNode = node.nextSibling;
	if (!mathArgumentNode || !mathArgumentNode.type.is(latex.MathArgument))
		return null;
	const openBraceNode = mathArgumentNode.firstChild;
	if (!openBraceNode || !openBraceNode.type.is(latex.OpenBrace)) return null;
	const mathNode = openBraceNode.nextSibling;
	if (!mathNode || !mathNode.type.is(latex.Math)) return null;
	const closeBraceNode = mathNode.nextSibling;
	if (!closeBraceNode || !closeBraceNode.type.is(latex.CloseBrace))
		return null;
	return {
		mathArgumentNode,
		openBraceNode,
		mathNode,
		closeBraceNode,
	};
}

function extractTextArgument(node: SyntaxNode) {
	const textArgumentNode = node.nextSibling;
	if (!textArgumentNode || !textArgumentNode.type.is(latex.TextArgument))
		return null;
	const openBraceNode = textArgumentNode.firstChild;
	if (!openBraceNode || !openBraceNode.type.is(latex.OpenBrace)) return null;
	const textNode = openBraceNode.nextSibling;
	if (!textNode || !textNode.type.is(latex.LongArg)) return null;
	const closeBraceNode = textNode.nextSibling;
	if (!closeBraceNode || !closeBraceNode.type.is(latex.CloseBrace))
		return null;
	return {
		textArgumentNode,
		openBraceNode,
		textNode,
		closeBraceNode,
	};
}

function handleFrac(cursor: TreeCursor, doc: EquationText): HandleConcealResult {
	const node = cursor.node;
	const numeratorNode = extractMathArgument(node);
	if (!numeratorNode) return { spec: [], kind: HandleResultKind.Handled };
	const denominatorNode = extractMathArgument(numeratorNode.mathArgumentNode);
	if (!denominatorNode) return { spec: [], kind: HandleResultKind.Handled };
	const nominatorOpen = numeratorNode.openBraceNode;
	const nominatorClose = numeratorNode.closeBraceNode;
	const denominatorOpen = denominatorNode.openBraceNode;
	const denominatorClose = denominatorNode.closeBraceNode;
	const fractionContent = doc.slice(nominatorOpen.from, denominatorClose.to);
	if (fractions[fractionContent]) {
		cursor.moveTo(node.to, -1);
		const spec = [
			{
				start: node.from,
				end: denominatorClose.to,
				text: fractions[fractionContent],
			},
		];
		return { spec, kind: HandleResultKind.Handled };
	}

	const hideFrac = {
		start: node.from,
		end: node.to,
		text: "",
	};
	const convertOpenSibling = {
		start: nominatorOpen.from,
		end: nominatorOpen.to,
		text: "(",
		class: "cm-bracket",
	};
	const convertCloseSibling = {
		start: nominatorClose.from,
		end: nominatorClose.to,
		text: ")",
		class: "cm-bracket",
	};
	const betweenSlash = {
		start: nominatorClose.to,
		end: nominatorClose.to,
		text: "/",
		class: "cm-bracket",
	};
	const convertOpenSecondSibling = {
		start: denominatorOpen.from,
		end: denominatorOpen.to,
		text: "(",
		class: "cm-bracket",
	};
	const convertCloseSecondSibling = {
		start: denominatorClose.from,
		end: denominatorClose.to,
		text: ")",
		class: "cm-bracket",
	};

	const spec = [
		hideFrac,
		convertOpenSibling,
		convertCloseSibling,
		betweenSlash,
		convertOpenSecondSibling,
		convertCloseSecondSibling,
	];
	return { spec, kind: HandleResultKind.Handled };
}

function handleModifier(cursor: TreeCursor, doc: EquationText, macro: string): HandleConcealResult {
	const nodeRef = cursor.node;
	const modifier = modifiers[macro as keyof typeof modifiers];
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return { spec: [], kind: HandleResultKind.Handled };
	const contentNode = mathArgumentNode.mathNode;
	const sibling = mathArgumentNode.closeBraceNode;
	const content = doc.slice(contentNode.from, contentNode.to);
	const symbol = /^[A-Za-z]$/.test(content)
		? content
		: content[0] === "\\" && greek[content.slice(1)];
	if (!symbol) return { spec: [], kind: HandleResultKind.Handled };
	cursor.moveTo(sibling.to, 1);
	doc.skipCursorMove = true;
	const spec = [
		{
			start: nodeRef.from,
			end: sibling.to,
			text: symbol + modifier,
			class: "latex-suite-unicode",
		},
	];
	return { spec, kind: HandleResultKind.Handled };
}

function getLimitLength(cursor: TreeCursor, doc: EquationText) {
	const peekCursor = cursor.node.cursor();
	peekCursor.next();
	const sibling = peekCursor.node;
	if (
		sibling.type.is(latex.CtrlSeq) &&
		doc.slice(sibling.from + 1, sibling.to) === "limits"
	) {
		cursor.moveTo(sibling.to, 1);
		doc.skipCursorMove = true;
		return sibling.to;
	}
	return cursor.to;
}

function handleBracket(cursor: TreeCursor, _doc: EquationText, macro: string): HandleConcealResult {
	const symbol = brackets[macro];
	const spec=[
		{
			start: cursor.from,
			end: cursor.to,
			text: symbol,
			class: "cm-bracket",
		}
	]
	return {spec, kind: HandleResultKind.Handled };
}

function handleBraKet(cursor: TreeCursor, _doc: EquationText, macro: string): HandleConcealResult {
	const langle = "〈";
	const rangle = "〉";
	const vert = "|";
	const node = cursor.node;
	const mathArgument = extractMathArgument(node);
	if (!mathArgument) return { spec: [], kind: HandleResultKind.Handled };
	const close = mathArgument.closeBraceNode;
	const open = mathArgument.openBraceNode;
	
	const left = macro === "ket" ? vert : langle;
	const right = macro === "bra" ? vert : rangle;

	const spec = [
		{ start: node.from, end: open.from, text: "" },
		{ start: open.from, end: open.to, text: left },
		{ start: close.from, end: close.to, text: right },
	];

	return {spec, kind: HandleResultKind.Handled };
}

function handleOperator(cursor: TreeCursor, doc: EquationText, macro: string): HandleConcealResult {
	const nodeRef = cursor.node;
	const end = getLimitLength(cursor, doc);
	const spec = [
		{
			start: nodeRef.from,
			end: end,
			text: macro,
			class: "cm-concealed-mathrm cm-variable-2",
		},
	];
	return { spec, kind: HandleResultKind.Handled };
}

function handleLeftRight(cursor: TreeCursor, doc: EquationText): HandleConcealResult {
	const from = cursor.from;
	const peekCursor = cursor.node.cursor();
	if (!peekCursor.next()) return { spec: [], kind: HandleResultKind.Handled };
	const rawSymbol = doc.slice(peekCursor.from, peekCursor.to);
	const symbol = leftrightBrackets[rawSymbol] ||
		(rawSymbol[0] === "\\" && brackets[rawSymbol.slice(1)]);
	if (symbol) {
		cursor.moveTo(peekCursor.to, 1);
		doc.skipCursorMove = true;
		const spec = [
			{
				start: from,
				end: peekCursor.to,
				text: symbol,
				class: "cm-bracket",
			},
		]
		return {spec, kind: HandleResultKind.Handled };
	}
	return { spec: [], kind: HandleResultKind.NotHandled };
}

function handleSubSup(doc: EquationText, nodeRef: SyntaxNode, cursor: TreeCursor): HandleConcealResult {
	const char = doc.slice(nodeRef.from, nodeRef.to);
	if (char !== "_" && char !== "^") return { spec: [], kind: HandleResultKind.Handled };
	const type = char === "_" ? "sub" : "sup";
	const allowed_names = [
		"MathCommand",
		"Group",
		"MathDelimitedGroup",
		"MathCommand",
		"MathChar",
		"Number",
	];
	const peekCursor = cursor.node.cursor();
	if (!peekCursor.next()) return { spec: [], kind: HandleResultKind.Handled };
	const nextNode = peekCursor.node;
	if (!allowed_names.includes(nextNode.name)) {
		return { spec: [], kind: HandleResultKind.Handled };
	}

	const newDoc = new EquationText(
		doc.eqn,
		nextNode.from,
		nextNode.to,
		doc.offset
	);

	const recursed_specs = traverseTree(nextNode, newDoc);
	const isGroup = nextNode.name === "Group";
	let maxEnd = nextNode.from + Number(isGroup);
	const textArray: string[] = [];
	const sorted_recursed_specs = recursed_specs.flat().sort((a,b) => a.start - b.start);
	let skipFull = false;
	for (const spec of sorted_recursed_specs) {
		if (spec.end < maxEnd) {
			continue;
		} else if ("elementType" in spec || "class" in spec) {
			skipFull = true;
			break
		}
		textArray.push(doc.slice(maxEnd, spec.start), spec.text);
		maxEnd = spec.end;
	}
	if (skipFull) {
		return { spec: [], kind: HandleResultKind.Handled };
	}
	textArray.push(
		doc.slice(maxEnd, nextNode.to - Number(isGroup))
	);
	cursor.moveTo(nextNode.to, 1);
	doc.skipCursorMove = true;

	const spec = [
		{
			start: nodeRef.from,
			end: nextNode.to,
			text: textArray.join(""),
			class: "cm-number",
			elementType: type,
		},
	];
	return { spec, kind: HandleResultKind.Handled };
}

function handleOperatorName(cursor: TreeCursor, doc: EquationText): HandleConcealResult {
	const nodeRef = cursor.node;
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return { spec: [], kind: HandleResultKind.Handled };
	const contentNode = mathArgumentNode.mathNode;
	const close = mathArgumentNode.closeBraceNode;
	const text = doc.slice(contentNode.from, contentNode.to);
	if (/[^A-Za-z]/.test(text)) {
		return { spec: [], kind: HandleResultKind.Handled };
	}
	cursor.moveTo(close.to, 1);
	doc.skipCursorMove = true;

	const spec = [
		{
			start: nodeRef.from,
			end: close.to,
			text,
			class: "cm-concealed-mathrm cm-variable-2",
		},
	];
	return { spec, kind: HandleResultKind.Handled };
}

function handleSet(cursor: TreeCursor, doc: EquationText): HandleConcealResult {
	const nodeRef = cursor.node;
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return { spec: [], kind: HandleResultKind.Handled };
	const open = mathArgumentNode.openBraceNode;
	const close = mathArgumentNode.closeBraceNode;
	cursor.moveTo(open.to, 1);
	doc.skipCursorMove = true;

	const hideSet = {
		start: nodeRef.from,
		end: nodeRef.to,
		text: "",
	};
	const openBrace = {
		start: open.from,
		end: open.to,
		text: "{",
		class: "cm-bracket",
	};
	const closeBrace = {
		start: close.from,
		end: close.to,
		text: "}",
		class: "cm-bracket",
	};

	const spec = [
		hideSet,
		openBrace,
		closeBrace,
	];
	return { spec, kind: HandleResultKind.Handled };
}

function handleText(cursor: TreeCursor, doc: EquationText): HandleConcealResult {
	const nodeRef = cursor.node;
	const textArgumentNode = extractTextArgument(nodeRef);
	if (!textArgumentNode) return { spec: [], kind: HandleResultKind.Handled };
	const contentNode = textArgumentNode.textNode;
	const close = textArgumentNode.closeBraceNode;
	const textContent = doc.slice(contentNode.from, contentNode.to);
	if (/[^A-Za-z0-9-.!?() ]/.test(textContent)) {
		return { spec: [], kind: HandleResultKind.Handled };
	}
	cursor.moveTo(close.to, 1);
	doc.skipCursorMove = true;

	const spec =  [
		{
			start: nodeRef.from,
			end: close.to,
			text: textContent,
			class: "cm-concealed-mathrm cm-variable-2",
		},
	];
	return { spec, kind: HandleResultKind.Handled };
}

function handleMathcal(cursor: TreeCursor, doc: EquationText): HandleConcealResult {
	const nodeRef = cursor.node;
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return { spec: [], kind: HandleResultKind.Handled };
	const contentNode = mathArgumentNode.mathNode;
	const close = mathArgumentNode.closeBraceNode;
	const mappedChars = doc
		.slice(contentNode.from, contentNode.to)
		.split("")
		.map((char) => mathscrcal[char]);
	if (mappedChars.some((char) => !char)) {
		return { spec: [], kind: HandleResultKind.Handled };
	}
	cursor.moveTo(close.to, 1);
	doc.skipCursorMove = true;

	const spec = [
		{
			start: nodeRef.from,
			end: close.to,
			text: mappedChars.join(""),
		},
	];
	return { spec, kind: HandleResultKind.Handled };
}

function handleTextModifiers(cursor: TreeCursor, doc: EquationText, macro: string): HandleConcealResult {
	const nodeRef = cursor.node;
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return { spec: [], kind: HandleResultKind.Handled };
	const contentNode = mathArgumentNode.mathNode;
	const sibling = mathArgumentNode.closeBraceNode;
	let content = doc.slice(contentNode.from, contentNode.to);
	if (/[^A-Za-z0-9 ]/.test(content)) {
		if (!(
			(macro === "underline" || macro === "boldsymbol") &&
			content[0] === "\\" &&
			content.slice(1) in greek
		)) {
			return { spec: [], kind: HandleResultKind.Handled };
		}
		content = greek[content.slice(1)];
	}
	if (macro === "mathbb") {
		content = content
			.split("")
			.map((char) => mathbb[char])
			.join("");
	}
	cursor.moveTo(sibling.to, 1);
	doc.skipCursorMove = true;
	const spec = [
		{
			start: nodeRef.from,
			end: sibling.to,
			text: content,
			class: textModifiers[macro as keyof typeof textModifiers],
		},
	];
	return { spec, kind: HandleResultKind.Handled };
}

function handleNot(cursor: TreeCursor, doc: EquationText): HandleConcealResult {
	const notFrom = cursor.from;
	const peekCursor = cursor.node.cursor();
	if (!peekCursor.next()) return { spec: [], kind: HandleResultKind.Handled };
	const sibling = peekCursor.node;
	const to = cursor.to;
	const symbol = doc.slice(sibling.from + 1, sibling.to);
	const notSymbol = not_remap[symbol];
	if (!notSymbol) {
		return { spec: [], kind: HandleResultKind.Handled };
	}
	cursor.moveTo(sibling.to, 1);
	doc.skipCursorMove = true;
	const spec = [
		{
			start: notFrom,
			end: to,
			text: notSymbol,
		},
	];
	return { spec, kind: HandleResultKind.Handled };
}


const fractionsMacro = ["frac", "dfrac", "tfrac", "gfrac"];
const braketMacro = ["bra", "ket", "braket"];
const macroMap = {
	"not": handleNot,
	"left": handleLeftRight,
	"right": handleLeftRight,
	"mathcal": handleMathcal,
	"text": handleText,
	"set": handleSet,
	"operatorname": handleOperatorName,
} as Record<string, (cursor: TreeCursor, doc: EquationText, macro?: string) => HandleConcealResult>;
for (const macro of Object.keys(modifiers)) {
	macroMap[macro] = handleModifier;
}
for (const macro of Object.keys(brackets)) {
	macroMap[macro] = handleBracket;
}
for (const macro of Object.keys(textModifiers)) {
	macroMap[macro] = handleTextModifiers;
}
for (const macro of fractionsMacro) {
	macroMap[macro] = handleFrac;
}
for (const macro of braketMacro) {
	macroMap[macro] = handleBraKet;
}
for (const macro of operators) {
	macroMap[macro] = handleOperator
}

function traverseTree(topNode: SyntaxNode, doc: EquationText): ConcealSpec[] {
	const specs: ConcealSpec[] = [];
	for (const cursor of iterateTreeCursor(topNode, doc)) {
		const nodeRef = cursor.node;
		if (nodeRef.name.endsWith("CtrlSeq")) {
			const macro = doc.slice(nodeRef.from + 1, nodeRef.to);
			const handler = macroMap[macro];
			if (handler) {
				const { spec, kind } = handler(cursor, doc, macro);
				if (kind === HandleResultKind.Handled) {
					specs.push(spec);
					continue;
				}
			}
			const symbol = ALL_SYMBOLS[macro];
			if (!symbol) continue;
			const end = getLimitLength(cursor, doc);
			specs.push([
				{
					start: nodeRef.from,
					end: end,
					text: symbol,
				},
			]);
			continue;
		} else if (nodeRef.type.is(latex.MathSpecialChar)) {
			const subSupSpec = handleSubSup(doc, nodeRef, cursor);
			if (subSupSpec.kind === HandleResultKind.Handled) {
				specs.push(subSupSpec.spec);
			}
			continue;

		}
	}
	return specs;
}

export type ConcealCachedEquations = Record<string, ConcealSpec[]>;
export function conceal(
	view: EditorView,
	cached_equations: ConcealCachedEquations,
): { specs: ConcealSpec[]; cached_equations: ConcealCachedEquations } {
	const boundsPlugin = getMathBoundsPlugin(view);
	const overlays = boundsPlugin.getEquationOverlays(view.state);
	const overlays_by_line = overlays.flatMap((eqn) => {
		const lines = eqn.text.split("\n");
		const lines_lengths = cumulativeSum(lines.map(l => l.length + 1))
		lines_lengths.unshift(0)
		return lines
			.map((line, i) => ({
				text: line,
				bound: eqn.bound,
				overlay: {
					from: eqn.overlay.from + lines_lengths[i],
					to: eqn.overlay.to + lines_lengths[i],
				},
			}))
			.filter((line) => line.text.trim() !== "");
	});
	const new_equations: typeof cached_equations = {};
	const specs: ConcealSpec[] = [];

	for (const eqn of overlays_by_line) {
		if (eqn.text in cached_equations) {
			new_equations[eqn.text] = cached_equations[eqn.text];
			specs.push(
				...cached_equations[eqn.text].map((specs) =>
					specs.map((spec) => ({
						...spec,
						start: spec.start + eqn.overlay.from,
						end: spec.end + eqn.overlay.from,
					})),
				),
			);
			continue;
		}
		const bound = eqn.bound;
		new_equations[eqn.text] = [];
		const localSpecs = traverseTree(
			bound.tree,
			new EquationText(eqn.text, eqn.overlay.from, eqn.overlay.to),
		);
		specs.push(...localSpecs);
		// keep cached equations relative to the overlay start such that duplicates can exists and
		// be retrieved regardless of their position in the document
		new_equations[eqn.text] = localSpecs.map((specs) =>
			specs.map((spec) => ({
				...spec,
				start: spec.start - eqn.overlay.from,
				end: spec.end - eqn.overlay.from,
			})),
		);
	}
	cached_equations = new_equations;

	return { specs, cached_equations };
}
