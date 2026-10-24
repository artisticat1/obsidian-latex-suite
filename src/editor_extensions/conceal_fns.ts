// Conceal functions

import { EditorView } from "@codemirror/view";
import type { ConcealSpec } from "./conceal";
import { type ConcealMapping } from "./conceal_maps";
import { type SyntaxNode, TreeCursor } from "@lezer/common";
import { cumulativeSum } from "src/utils/editor_utils";
import { EquationText, iterateTreeCursor } from "src/utils/tokenizer";
import { getMathBoundsPlugin } from "src/editor_context/mathbounds";
import { latex } from "src/parser/latex-terms";



export type MappingInfo = {
	maps: ConcealMapping;
	macroMap: MacroHandlerMap;
};

const textModifiers = {
	mathbf: "cm-concealed-bold",
	boldsymbol: "cm-concealed-bold",
	// underline: "cm-concealed-underline",
	mathrm: "cm-concealed-mathrm",
	mathbb: undefined,
} satisfies Record<string, string | undefined>;

const modifiers = {
	hat: "\u0302",
	dot: "\u0307",
	ddot: "\u0308",
	// overline: "\u0304",
	bar: "\u0304",
	tilde: "\u0303",
	vec: "\u20D7",
	overrightarrow: "\u20D7",
} satisfies Record<string, string>;

enum HandleResultKind {
	NotHandled,
	Handled,
	RecursiveHandled,
}

type HandleConcealResult =
	| {
		spec: ConcealSpec;
		kind: HandleResultKind.Handled;
	}
	| {
		kind: HandleResultKind.NotHandled;
	}
	| {
		spec: ConcealSpec[];
		kind: HandleResultKind.RecursiveHandled;
	};

function notHandled(): { kind: HandleResultKind.NotHandled } {
	return { kind: HandleResultKind.NotHandled };
}

function handled(spec: ConcealSpec): { spec: ConcealSpec; kind: HandleResultKind.Handled } {
	return { spec, kind: HandleResultKind.Handled };
}

function recursiveHandled(spec: ConcealSpec[]): { spec: ConcealSpec[]; kind: HandleResultKind.RecursiveHandled } {
	return { spec, kind: HandleResultKind.RecursiveHandled };
}

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

function extractMathArgumentStar(node: SyntaxNode, doc: EquationText) {
	const peekCursor = node.cursor();
	if (!peekCursor.next()) return null;
	const mathSpecial = peekCursor.node;
	if (!mathSpecial.type.is(latex.MathSpecialChar) || doc.slice(mathSpecial.from, mathSpecial.to) !== "*") return null;
	const group = mathSpecial.nextSibling;
	if (!group || !group.type.is("Group")) return null;
	const openBraceNode = group.firstChild;
	if (!openBraceNode || !openBraceNode.type.is(latex.OpenBrace)) return null;
	const mathNode = openBraceNode.nextSibling;
	if (!mathNode || !mathNode.type.is(latex.Math)) return null;
	const closeBraceNode = mathNode.nextSibling;
	if (!closeBraceNode || !closeBraceNode.type.is(latex.CloseBrace))
		return null;
	return {
		mathArgumentNode: group,
		openBraceNode,
		mathNode,
		closeBraceNode,
	};
}
function extractShortTextArgument(node: SyntaxNode) {
	const textArgumentNode = node.nextSibling;
	if (!textArgumentNode || !textArgumentNode.type.is(latex.ShortTextArgument))
		return null;
	const openBraceNode = textArgumentNode.firstChild;
	if (!openBraceNode || !openBraceNode.type.is(latex.OpenBrace)) return null;
	const textNode = openBraceNode.nextSibling;
	if (!textNode || !textNode.type.is(latex.ShortArg)) return null;
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

function handleFrac({cursor, doc, maps}: MacroHandlerOptions): HandleConcealResult {
	const node = cursor.node;
	const numeratorNode = extractMathArgument(node);
	if (!numeratorNode) return handled([]);
	const denominatorNode = extractMathArgument(numeratorNode.mathArgumentNode);
	if (!denominatorNode) return handled([]);
	const nominatorOpen = numeratorNode.openBraceNode;
	const nominatorClose = numeratorNode.closeBraceNode;
	const denominatorOpen = denominatorNode.openBraceNode;
	const denominatorClose = denominatorNode.closeBraceNode;
	const fractionContent = doc.slice(nominatorOpen.from, denominatorClose.to);
	if (maps.fractions[fractionContent]) {
		doc.moveTo(cursor, node.to, -1);
		const spec = [
			{
				start: node.from,
				end: denominatorClose.to,
				text: maps.fractions[fractionContent],
			},
		];
		return handled(spec);
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
	return handled(spec);
}

function handleOverline({cursor, doc, maps, macro, macroMap}: MacroHandlerOptions): HandleConcealResult {
	const nodeRef = cursor.node;
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return handled([]);
	const contentNode = mathArgumentNode.mathNode;
	const sibling = mathArgumentNode.closeBraceNode;
	const newDoc = new EquationText(
		doc.eqn,
		contentNode.from,
		contentNode.to,
		doc.offset
	);
	const mathSpecs = traverseTree(
		contentNode,
		newDoc,
		{ maps, macroMap },
	);
	const parentClassNumbers: ({ end: number, number: number })[] = [];

	for (const spec of mathSpecs.flat(1)) {
		const specClass = spec.class
		if (specClass && specClass.startsWith(`latex-suite-${macro}`)) {
			const last = parentClassNumbers.last();
			if (last && last.end >= spec.start) {
				last.number++;
			} else {
				parentClassNumbers.push({ end: spec.end, number: 1 });
			}
		}
	}
	const parentClassNumber = Math.max(...parentClassNumbers.map((spec) => spec.number), 0);
	const parentClass = `latex-suite-${macro} latex-suite-${macro}-${Math.min(parentClassNumber, 2)}`;
	const spec: ConcealSpec = [
		{
			start: nodeRef.from,
			end: contentNode.from,
			text: "",
		},
		{
			start: contentNode.from,
			end: contentNode.to,
			text: doc.slice(contentNode.from, contentNode.to),
			class: parentClass,
			marks: true,
		},
		{
			start: contentNode.to,
			end: sibling.to,
			text: "",
		},
	]
	return recursiveHandled([spec, ...mathSpecs]);
}

function handleModifier({cursor, doc, macro, maps}: MacroHandlerOptions): HandleConcealResult {
	const greek = maps.greek;
	const nodeRef = cursor.node;
	const modifier = modifiers[macro as keyof typeof modifiers];
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return handled([]);
	const contentNode = mathArgumentNode.mathNode;
	const sibling = mathArgumentNode.closeBraceNode;
	const content = doc.slice(contentNode.from, contentNode.to);
	const symbol = /^[A-Za-z]$/.test(content)
		? content
		: content[0] === "\\" && greek[content.slice(1)];
	if (!symbol) return handled([]);
	doc.moveTo(cursor, sibling.to, 1);
	doc.skipCursorMove = true;
	const spec = [
		{
			start: nodeRef.from,
			end: sibling.to,
			text: symbol + modifier,
			class: "latex-suite-unicode",
		},
	];
	return handled(spec);
}

function getLimitLength(cursor: TreeCursor, doc: EquationText) {
	const peekCursor = cursor.node.cursor();
	peekCursor.next();
	const sibling = peekCursor.node;
	if (
		(sibling.type.is(latex.MathCommand)) &&
		doc.slice(sibling.from + 1, sibling.to) === "limits"
	) {
		doc.moveTo(cursor, sibling.to, 1);
		doc.skipCursorMove = true;
		return sibling.to;
	}
	return cursor.to;
}

function handleBracket({cursor, macro, maps}: MacroHandlerOptions): HandleConcealResult {
	const symbol = maps.brackets[macro];
	if (!symbol) return handled([]);
	const spec= [
		{
			start: cursor.from,
			end: cursor.to,
			text: symbol,
			class: "cm-bracket",
		}
	]
	return handled(spec);
}

function handleBraKet({cursor, macro}: MacroHandlerOptions): HandleConcealResult {
	const langle = "〈";
	const rangle = "〉";
	const vert = "|";
	const node = cursor.node;
	const mathArgument = extractMathArgument(node);
	if (!mathArgument) return handled([]);
	const close = mathArgument.closeBraceNode;
	const open = mathArgument.openBraceNode;

	const left = macro === "ket" ? vert : langle;
	const right = macro === "bra" ? vert : rangle;

	const spec = [
		{ start: node.from, end: open.from, text: "" },
		{ start: open.from, end: open.to, text: left },
		{ start: close.from, end: close.to, text: right },
	];

	return handled(spec);
}

function handleOperator({cursor, doc, macro}: MacroHandlerOptions): HandleConcealResult {
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
	return handled(spec);
}

function handleLeftRight({cursor, doc, maps}: MacroHandlerOptions): HandleConcealResult {
	const {leftrightBrackets, brackets} = maps
	const from = cursor.from;
	const peekCursor = cursor.node.cursor();
	if (!peekCursor.next()) return handled([]);
	const rawSymbol = doc.slice(peekCursor.from, peekCursor.to);
	const symbol = leftrightBrackets[rawSymbol] ||
		(rawSymbol[0] === "\\" && brackets[rawSymbol.slice(1)]);
	if (symbol) {
		doc.moveTo(cursor, peekCursor.to, 1);
		doc.skipCursorMove = true;
		const spec = [
			{
				start: from,
				end: peekCursor.to,
				text: symbol,
				class: "cm-bracket",
			},
		]
		return handled(spec);
	}
	return notHandled();
}



function handleTextColor({cursor, doc}: MacroHandlerOptions): HandleConcealResult {
	const shortTextArgumentNode = extractShortTextArgument(cursor.node);
	if (!shortTextArgumentNode) return handled([]);
	const mathArgumentNode = extractMathArgument(shortTextArgumentNode.textArgumentNode);
	if (!mathArgumentNode) return handled([]);
	const color = doc.slice(shortTextArgumentNode.textNode.from, shortTextArgumentNode.textNode.to);
	const start = cursor.from;
	return handled([
		{
			start,
			end: mathArgumentNode.mathNode.from,
			text: "",
		},
		{
			start,
			end: mathArgumentNode.mathArgumentNode.to,
			text: doc.slice(
				mathArgumentNode.mathNode.from,
				mathArgumentNode.mathNode.to,
			),
			class: "cm-concealed-text-color",
			marks: true,
			style: `color: ${color};`,
		},
		{
			start: mathArgumentNode.mathNode.to,
			end: mathArgumentNode.mathArgumentNode.to,
			text: "",
		},
	]);
}

// function flattenSpecs(
// 	mathSpecs: ConcealSpec[],
// 	{from, to}: CMBound,
// 	doc: EquationText,
// ): ConcealSpec {
// 		if (spec.replacements) {
// 			const newDoc = new EquationText(
// 				doc.eqn,
// 				spec.start,
// 				spec.end,
// 				doc.offset
// 			);
// 			replacements.push(...flattenSpecs([spec.replacements], {from: spec.start, to: spec.end}, newDoc));
// 		} else {
// 			replacements.push(spec);
// 		}
// 		startPos = spec.end;



// }

/**
 * helper for getting the first unicode grapheme cluster, 
 * works on ios 14.5+ and obsidian 1.1.0 still supports ios 12+ thus
 * using `String.codePointAt` as an alternative if the built in `Intl.Segmenter` isn't available.
 * @param text the text to get the first unicode grapheme cluster from.
 */
function getFirstUnicodeCharacter(text: string): string {
	if (!window?.Intl?.Segmenter) {
		return String.fromCodePoint(text.codePointAt(0)!)
	}
	const segmenter = new Intl.Segmenter("en", {granularity: "grapheme"})
	return segmenter.segment(text)[Symbol.iterator]().next().value!.segment
}

function handleSubSup({ doc, cursor, maps, macroMap }: MacroHandlerOptions): HandleConcealResult {
	const nodeRef = cursor.node;
	const endChar = doc.slice(Math.max(nodeRef.from, nodeRef.to - 1), nodeRef.to);
	if (endChar !== "_" && endChar !== "^") return notHandled();
	const start = nodeRef.to - 1;
	const type = endChar === "_" ? "sub" : "sup";
	const allowed_names = [
		"MathCommand",
		"Group",
		"MathDelimitedGroup",
		"MathChar",
		"Number",
	];
	const peekCursor = cursor.node.cursor();
	if (!peekCursor.next()) return handled([]);
	const nextNode = peekCursor.node;
	if (!allowed_names.includes(nextNode.name)) {
		return notHandled();
	}
	if (nextNode.name === "MathChar" || nextNode.name === "Number") {
		const fullText = doc.slice(nextNode.from, nextNode.to)
		const firstUnicodeChar = getFirstUnicodeCharacter(fullText)
		doc.moveTo(cursor, nextNode.to, 1);
		doc.skipCursorMove = true;
		const spec = {
			start,
			end: nextNode.from + firstUnicodeChar.length,
			text: firstUnicodeChar,
			class: "cm-number",
			elementType: type,
		};
		return handled([spec]);
	}

	const newDoc = new EquationText(
		doc.eqn,
		nextNode.from,
		nextNode.to,
		doc.offset
	);

	const recursed_specs = traverseTree(nextNode, newDoc, { maps, macroMap });
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
	doc.moveTo(cursor, nextNode.to, 1);
	doc.skipCursorMove = true;
	if (skipFull) {
		return recursiveHandled(recursed_specs);
	}
	textArray.push(
		doc.slice(maxEnd, nextNode.to - Number(isGroup))
	);

	const spec = [
		{
			start,
			end: nextNode.to,
			text: textArray.join(""),
			class: "cm-number",
			elementType: type,
		},
	];
	return recursiveHandled([spec, ...recursed_specs]);
}

function handleOperatorName({cursor, doc}: MacroHandlerOptions): HandleConcealResult {
	const nodeRef = cursor.node;
	const mathArgumentNode = extractMathArgument(nodeRef) || extractMathArgumentStar(nodeRef, doc);
	if (!mathArgumentNode) return handled([]);
	const contentNode = mathArgumentNode.mathNode;
	const close = mathArgumentNode.closeBraceNode;
	const text = doc.slice(contentNode.from, contentNode.to);
	if (/[^A-Za-z]/.test(text)) {
		return handled([]);
	}
	doc.moveTo(cursor, close.to, 1);
	doc.skipCursorMove = true;

	const spec = [
		{
			start: nodeRef.from,
			end: close.to,
			text,
			class: "cm-concealed-mathrm cm-variable-2",
		},
	];
	return handled(spec);
}

function handleSet({cursor, doc}: MacroHandlerOptions): HandleConcealResult {
	const nodeRef = cursor.node;
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return handled([]);
	const open = mathArgumentNode.openBraceNode;
	const close = mathArgumentNode.closeBraceNode;
	doc.moveTo(cursor, open.to, 1);
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
		text: "",
		class: "cm-bracket",
	};

	const spec = [
		hideSet,
		openBrace,
		closeBrace,
	];
	return handled(spec);
}

function handleText({cursor, doc}: MacroHandlerOptions): HandleConcealResult {
	const nodeRef = cursor.node;
	const textArgumentNode = extractTextArgument(nodeRef);
	if (!textArgumentNode) return handled([]);
	const contentNode = textArgumentNode.textNode;
	const close = textArgumentNode.closeBraceNode;
	const textContent = doc.slice(contentNode.from, contentNode.to);
	if (/[^A-Za-z0-9-.!?() ]/.test(textContent)) {
		return handled([]);
	}
	doc.moveTo(cursor, close.to, 1);
	doc.skipCursorMove = true;

	const spec =  [
		{
			start: nodeRef.from,
			end: close.to,
			text: textContent,
			class: "cm-concealed-mathrm cm-variable-2",
		},
	];
	return handled(spec);
}

function handleMathcal({cursor, doc, maps}: MacroHandlerOptions): HandleConcealResult {
	const mathscrcal = maps.mathscrcal;
	const nodeRef = cursor.node;
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return handled([]);
	const contentNode = mathArgumentNode.mathNode;
	const close = mathArgumentNode.closeBraceNode;
	const mappedChars = doc
		.slice(contentNode.from, contentNode.to)
		.split("")
		.map((char) => mathscrcal[char]);
	if (mappedChars.some((char) => !char)) {
		return handled([]);
	}
	doc.moveTo(cursor, close.to, 1);
	doc.skipCursorMove = true;

	const spec = [
		{
			start: nodeRef.from,
			end: close.to,
			text: mappedChars.join(""),
		},
	];
	return handled(spec);
}

function handleTextModifiers({cursor, doc, macro, maps}: MacroHandlerOptions): HandleConcealResult {
	const {greek, mathbb} = maps;
	const nodeRef = cursor.node;
	const mathArgumentNode = extractMathArgument(nodeRef);
	if (!mathArgumentNode) return handled([]);
	const contentNode = mathArgumentNode.mathNode;
	const sibling = mathArgumentNode.closeBraceNode;
	let content = doc.slice(contentNode.from, contentNode.to);
	if (/[^A-Za-z0-9 ]/.test(content)) {
		let tempContent: string | undefined;
		if (!(
			(macro === "underline" || macro === "boldsymbol") &&
			content[0] === "\\" &&
			(tempContent = greek[content.slice(1)])
		)) {
			return handled([]);
		}
		content = tempContent;
	}
	if (macro === "mathbb") {
		content = content
			.split("")
			.map((char) => mathbb[char])
			.join("");
	}
	doc.moveTo(cursor, sibling.to, 1);
	doc.skipCursorMove = true;
	const spec = [
		{
			start: nodeRef.from,
			end: sibling.to,
			text: content,
			class: textModifiers[macro as keyof typeof textModifiers],
		},
	];
	return handled(spec);
}

function handleNot({cursor, doc, maps}: MacroHandlerOptions): HandleConcealResult {
	const {not_remap} = maps;
	const notFrom = cursor.from;
	const peekCursor = cursor.node.cursor();
	if (!peekCursor.next()) return handled([]);
	const sibling = peekCursor.node;
	const to = cursor.to;
	const symbol = doc.slice(sibling.from + 1, sibling.to);
	const notSymbol = not_remap[symbol];
	if (!notSymbol) {
		return handled([]);
	}
	doc.moveTo(cursor, sibling.to, 1);
	doc.skipCursorMove = true;
	const spec = [
		{
			start: notFrom,
			end: to,
			text: notSymbol,
		},
	];
	return handled(spec);
}

function handleAllSymbols({cursor, doc, macro, maps}: MacroHandlerOptions): HandleConcealResult {
	const { ALL_SYMBOLS } = maps;
	const symbol = ALL_SYMBOLS[macro];
	if (!symbol) return handled([]);
	const nodeRef = cursor.node;
	const end = getLimitLength(cursor, doc);
	const spec = [
		{
			start: nodeRef.from,
			end: end,
			text: symbol,
		},
	];
	return handled(spec);
}

const fractionsMacro = ["frac", "dfrac", "tfrac", "gfrac"];
const braketMacro = ["bra", "ket", "braket"];

type MacroHandlerOptions = {
	cursor: TreeCursor;
	doc: EquationText;
	macro: string;
} & MappingInfo;

type MacroHandlerMap = Record<string, (options: MacroHandlerOptions) => HandleConcealResult>;
export function createMacroMap(maps: ConcealMapping) : MacroHandlerMap {
	const macroMap: MacroHandlerMap = {
		"not": handleNot,
		"left": handleLeftRight,
		"right": handleLeftRight,
		"mathcal": handleMathcal,
		"text": handleText,
		"set": handleSet,
		"operatorname": handleOperatorName,
		"textcolor": handleTextColor,
		"overline": handleOverline,
		"underline": handleOverline,
	}	
	for (const macro of Object.keys(modifiers)) {
		macroMap[macro] = handleModifier;
	}
	for (const macro of Object.keys(maps.brackets)) {
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
	for (const macro of maps.operators) {
		macroMap[macro] = handleOperator
	}
	for (const macro of Object.keys(maps.ALL_SYMBOLS)) {
		macroMap[macro] = handleAllSymbols;
	}
	return macroMap
}

function traverseTree(topNode: SyntaxNode, doc: EquationText, {maps, macroMap}: MappingInfo): ConcealSpec[] {
	const specs: ConcealSpec[] = [];
	for (const cursor of iterateTreeCursor(topNode, doc)) {
		const nodeRef = cursor.node;
		if (nodeRef.name.endsWith("CtrlSeq") || nodeRef.name.endsWith("CtrlSym")) {
			const macro = doc.slice(nodeRef.from + 1, nodeRef.to);
			const handler = macroMap[macro];
			if (handler) {
				const result = handler({cursor, doc, macro, maps, macroMap});
				if (result.kind === HandleResultKind.Handled) {
					specs.push(result.spec);
					continue;
				} else if (result.kind === HandleResultKind.RecursiveHandled) {
					specs.push(...result.spec);
					continue;
				}
			}
			continue;
		} else if (nodeRef.type.is(latex.MathSpecialChar)) {
			const subSupSpec = handleSubSup({ doc, cursor, maps, macroMap, macro: doc.slice(nodeRef.from, nodeRef.to) });
			if (subSupSpec.kind === HandleResultKind.RecursiveHandled) {
				specs.push(...subSupSpec.spec);
				continue;
			}
		}
	}
	return specs;
}

export type ConcealCachedEquations = Record<string, ConcealSpec[]>;
export function conceal(
	view: EditorView,
	cached_equations: ConcealCachedEquations,
	{
		maps,
		macroMap
	}: MappingInfo
): { specs: ConcealSpec[]; cached_equations: ConcealCachedEquations } {
	const boundsPlugin = getMathBoundsPlugin(view);
	const overlays = boundsPlugin.getEquationOverlays(view.state);
	// get the all the lines from each overlay and their respective bounds, so that we can cache them separately
	// as concealments happen on a per-line basis. Technically an overlay should only span a single line or the full equation.
	// but on errorous syntax, the parser might not do that.
	const overlays_by_line = overlays.map((eqn) => {
		const lines = eqn.text.split("\n");
		const lines_lengths = cumulativeSum(lines.map(l => l.length + 1))
		lines_lengths.unshift(0)
		let lines_start = 0;
		return eqn.bound.overlay.map((overlay) => {
			const arr = [];
			for (;lines_start < lines_lengths.length - 1; lines_start++) {
				if (lines_lengths[lines_start]! + eqn.overlay.from >= overlay.to) break;
				// substract newline character from the end of the line, as it is not part of the overlay
				const line_end = Math.min(lines_lengths[lines_start + 1]! + eqn.overlay.from - 1, overlay.to);
				const start = Math.max(lines_lengths[lines_start]! + eqn.overlay.from, overlay.from)
				arr.push({
					text: eqn.text.slice(start - eqn.overlay.from, line_end - eqn.overlay.from),
					bound: eqn.bound,
					overlay: {
						from: start,
						to: line_end,
					},
				})
			}
			return arr
		})
	}).flat(2);
	const new_equations: typeof cached_equations = {};
	const specs: ConcealSpec[] = [];

	for (const eqn of overlays_by_line) {
		const cached = cached_equations[eqn.text];
		if (cached) {
			new_equations[eqn.text] = cached
			specs.push(
				...cached.map((specs) =>
					specs.map((spec) => ({
						...spec,
						start: spec.start + eqn.overlay.from,
						end: spec.end + eqn.overlay.from,
					})),
				),
			);
			continue;
		} else if (eqn.text.trim() === "") {
			continue;
		}
		const bound = eqn.bound;
		new_equations[eqn.text] = [];
		const localSpecs = traverseTree(
			bound.tree,
			new EquationText(eqn.text, eqn.overlay.from, eqn.overlay.to),
			{ maps, macroMap }
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
