/* eslint-disable @typescript-eslint/no-unused-expressions */
import { EditorView } from "@codemirror/view";
import { getMathBoundsPlugin } from "src/utils/context";
import { stackResolveIterate } from "src/utils/editor_utils";
import { ConcealSpec } from "./conceal";
import { map_super, map_sub, fractions, not_remap as raw_not_remap, brackets, mathscrcal, greek, mathbb, operators, cmd_symbols, leftrightBrackets } from "./conceal_maps";
import { SyntaxNode, TreeCursor } from "@lezer/common";
import { Text } from "@codemirror/state";
import { offset } from "@popperjs/core";
import { MathCommand } from "src/parser/mathjax/latex-parser.terms";

const ALL_SYMBOLS: Record<string,string> = Object.fromEntries(
	Object.entries({...greek, ...cmd_symbols}).sort((a,b) => b[0].length - a[0].length)
)
const not_remap: Record<string,string> = Object.fromEntries([
	...Object.entries(raw_not_remap).sort((a,b) => b[0].length - a[0].length)
]);

const modifiers = {
	"hat": "\u0302",
	"dot": "\u0307",
	"ddot": "\u0308",
	"overline": "\u0304",
	"bar": "\u0304",
	"tilde": "\u0303",
	"vec": "\u20D7",
} satisfies Record<string,string>

function traverseTree(topNode: SyntaxNode, doc: EquationText, recurse=true): ConcealSpec[] {
	const specs: ConcealSpec[] = []
	let count = 0;
	const cursor = topNode.cursor();
	const offset = doc.offset
	do {
		const nodeRef = cursor.node
		if (nodeRef.name.endsWith("CtrlSeq")) {
			const macro = doc.slice(nodeRef.from + 1, nodeRef.to)
			if (macro === "not") {
				handleNot(cursor, doc, specs)
				continue
			}  else if (["frac", "dfrac", "tfrac", "gfrac"].includes(macro)) {
				if (!cursor.nextSibling()) continue
				const sibling = cursor.node
				if (sibling.name !== "MathArgument") {
					cursor.prevSibling()
					continue
				}
				if (!cursor.nextSibling()) continue
				const secondSibling = cursor.node
				if (secondSibling.name !== "MathArgument") {
					cursor.prevSibling()
					cursor.prevSibling()
					continue
				}
				const wholeArg = doc.slice(sibling.from, secondSibling.to)
				if (fractions[wholeArg]) {
					specs.push([{
						start: nodeRef.from - offset,
						end: secondSibling.to - offset,
						text: fractions[wholeArg],
					}])
					continue
				}
				const siblingOpen = sibling.firstChild
				const siblingClose = sibling.lastChild
				const secondSiblingOpen = secondSibling.firstChild
				const secondSiblingClose = secondSibling.lastChild
				const siblingContent = siblingOpen?.nextSibling
				const secondSiblingContent = secondSiblingOpen?.nextSibling
				if (!siblingOpen || !siblingClose || !siblingContent || !secondSiblingOpen || !secondSiblingClose || !secondSiblingContent) {
					cursor.prevSibling()
					cursor.prevSibling()
					continue
				}
				const hideFrac = {
					start: nodeRef.from - offset,
					end: nodeRef.to - offset,
					text: "",
				};
				const convertOpenSibling = {
					start: siblingOpen.from - offset,
					end: siblingOpen.to - offset,
					text: "(",
					class: "cm-bracket",
				};
				const convertCloseSibling = {
					start: siblingClose.from - offset,
					end: siblingClose.to - offset,
					text: ")",
					class: "cm-bracket",
				};
				const betweenSlash = {
					start: siblingClose.to - offset,
					end: siblingClose.to - offset,
					text: "/",
					class: "cm-bracket",
				}
				const convertOpenSecondSibling = {
					start: secondSiblingOpen.from - offset,
					end: secondSiblingOpen.to - offset,
					text: "(",
					class: "cm-bracket",
				};
				const convertCloseSecondSibling = {
					start: secondSiblingClose.from - offset,
					end: secondSiblingClose.to - offset,
					text: ")",
					class: "cm-bracket",
				};
				specs.push([
					hideFrac,
					convertOpenSibling,
					convertCloseSibling,
					betweenSlash,
					convertOpenSecondSibling,
					convertCloseSecondSibling,
				]);
				specs.push(...traverseTree(siblingContent, doc));
				specs.push(...traverseTree(secondSibling, doc));
				continue
			} else if (macro in modifiers) {
				//TODO handle greek letters
				const modifier = modifiers[macro as keyof typeof modifiers]
				if (!cursor.nextSibling()) continue
				const sibling = cursor.node
				if (!cursor.firstChild()) {
					cursor.parent();
					continue;
				} else if (!cursor.nextSibling()) {
					cursor.prevSibling();
					continue;
				}
				const childSibling = cursor.node
				if (childSibling.name !== "Math") continue
				const argument = doc.slice(childSibling.from, childSibling.to)
				const symbol = /^[A-Za-z]$/.test(argument) ? argument : greek[argument.slice(1)]
				if (!symbol) continue
				specs.push([{
					start: nodeRef.from - offset,
					end: sibling.to - offset,
					text: symbol + modifier,
					class: "latex-suite-unicode",
				}])
				continue
			} else if (macro === "left" || macro === "right") {
				const from = cursor.from
				if (!cursor.next()) continue
				const rawSymbol = doc.slice(cursor.from, cursor.to)
				const symbol = leftrightBrackets[rawSymbol] ?? brackets[rawSymbol.slice(1)]
				if (symbol) {
					specs.push([{
						start: from - offset,
						end: cursor.to - offset,
						text: symbol,
						class: "cm-bracket",
					}])
					continue
				}
				cursor.prev();
			} else if (macro in brackets) {
				const symbol = brackets[macro];
				specs.push([{
					start: cursor.from - offset,
					end: cursor.to - offset,
					text: symbol,
					class: "cm-bracket"
				}])
				continue
			} else if (macro === "mathcal") {
				if (!cursor.nextSibling()) continue	
				const sibling = cursor.node
				if (sibling.name !== "MathArgument") {
					cursor.prevSibling()
					continue
				}
				const contentNode = sibling.firstChild?.nextSibling
				if (!contentNode || contentNode.name !== "Math") {
					cursor.prevSibling()
					continue
				}
				const mappedChars = doc.slice(contentNode.from, contentNode.to).split("").map((char) => mathscrcal[char])
				if (mappedChars.some((char) => !char)) {
					cursor.prevSibling()
					continue
				}
				specs.push([{
					start: nodeRef.from - offset,
					end: sibling.to - offset,
					text: mappedChars.join(""),
				}])
				continue
				
			} else if (macro === "mathbb") {
				// fix map as its not mathbb but
				// const regexStr = "\\\\(mathbf|boldsymbol|underline|mathrm|text|mathbb){([A-Za-z0-9 ]+)}";
				if (!cursor.nextSibling()) continue	
				const sibling = cursor.node
				if (sibling.name !== "MathArgument") {
					cursor.prevSibling()
					continue
				}
				const contentNode = sibling.firstChild?.nextSibling
				if (!contentNode || contentNode.name !== "Math") {
					cursor.prevSibling()
					continue
				}
				const mappedChars = doc.slice(contentNode.from, contentNode.to).split("").map((char) => mathbb[char])
				if (mappedChars.some((char) => !char)) {
					cursor.prevSibling()
					continue
				}
				specs.push([{
					start: nodeRef.from - offset,
					end: sibling.to - offset,
					text: mappedChars.join(""),
				}])
				continue
			} else if (macro === "text") {
				if (!cursor.nextSibling()) continue	
				const sibling = cursor.node
				if (sibling.name !== "TextArgument") {
					cursor.prevSibling()
					continue
				}
				const contentNode = sibling.firstChild?.nextSibling
				if (!contentNode || contentNode.name !== "LongArg") {
					cursor.prevSibling()
					continue
				}
				const textContent = doc.slice(contentNode.from, contentNode.to)
				if (/[^A-Za-z0-9-.!?() ]/.test(textContent)) {
					cursor.prevSibling()
					continue
				}
				specs.push([{
					start: nodeRef.from - offset,
					end: sibling.to - offset,
					text: textContent,
					class: "cm-concealed-mathrm cm-variable-2",
				}])
				continue
			} else if (["bra","ket", "braket"].includes(macro)) {

			} else if (macro === "set") {
				if (!cursor.nextSibling()) continue	
				const sibling = cursor.node
				if (sibling.name !== "MathArgument") {
					cursor.prevSibling()
					continue
				}
				const firstChild = sibling.firstChild
				const contentNode = firstChild?.nextSibling
				if (!contentNode || contentNode.name !== "Math") {
					cursor.prevSibling()
					continue
				}
				const setContent = traverseTree(contentNode, doc)
				const hideSet = {
					start: nodeRef.from - offset,
					end: nodeRef.to - offset,
					text: "",
				}
				const openBrace = {
					start: firstChild.from - offset,
					end: firstChild.to - offset,
					text: "{",
					class: "cm-bracket",
				}
				const closeBrace = {
					start: contentNode.to - offset,
					end: sibling.to - offset,
					text: "}",
					class: "cm-bracket",
				}
				specs.push(...setContent)
				specs.push([hideSet, openBrace,closeBrace])
				continue

			} else if (operators.includes(macro)) {
				let end = cursor.to
				// limit isn't required like for the others
				const next = cursor.next()
				const sibling = cursor.node
				if (sibling.name !== "CtrlSeq" && doc.slice(sibling.from + 1, sibling.to) !== "limits") {
					!next && cursor.prev()
				} else {
					end = sibling.to
				}
				specs.push([{
					start: nodeRef.from - offset,
					end: end - offset,
					text: macro,
					class: "cm-concealed-mathrm cm-variable-2",
				}])
				continue

			} else if (macro === "operatorname") {
				if (!cursor.nextSibling()) continue	
				const sibling = cursor.node
				if (sibling.name !== "MathArgument") {
					cursor.prevSibling()
					continue
				}
				const firstChild = sibling.firstChild
				const contentNode = firstChild?.nextSibling
				if (!contentNode || contentNode.name !== "Math") {
					cursor.prevSibling()
					continue
				}
				const text = doc.slice(contentNode.from, contentNode.to)
				if (/[^A-Za-z]/.test(text)) {
					cursor.prevSibling()
					continue
				}
				specs.push([{
					start: nodeRef.from - offset,
					end: sibling.to - offset,
					text,
					class: "cm-concealed-mathrm cm-variable-2",
				}])
				continue
			}
			const symbol = ALL_SYMBOLS[macro]
			if (!symbol) continue
			let end = cursor.to
			// limit isn't required like for the others
			const next = cursor.next()
			const sibling = cursor.node
			if (sibling.name !== "CtrlSeq" && doc.slice(sibling.from + 1, sibling.to) !== "limits") {
				!next && cursor.prev()
			} else {
				end = sibling.to
			}
			specs.push([{
				start: nodeRef.from - offset,
				end: end - offset,
				text: symbol,
			}])
			// moveNext(cursor)
			continue
		} else if (nodeRef.name === "MathSpecialChar" && recurse) {
			const char = doc.slice(nodeRef.from, nodeRef.to)
			if (char !== "_" && char !== "^") continue
			const type = char === "_" ? "sub" : "sup";
			const allowed_names = [
				"MathCommand",
				"Group",
				"MathDelimitedGroup",
				"MathCommand",
				"MathChar",
				"Number",
			]
			if (!cursor.next()) continue
			const nextNode = cursor.node
			if (!allowed_names.includes(nextNode.name)) {
				continue
			}
			const recursed_specs = traverseTree(nextNode, doc, false)
			const isGroup = nextNode.name === "Group"
			let maxEnd = nextNode.from - offset + Number(isGroup)
			const textArray: string[] = []
			recursed_specs.flat().forEach((spec) => {
				if (spec.end < maxEnd) {
					return;
				}
				textArray.push(doc.eqn.slice(maxEnd, spec.start), spec.text)
				maxEnd = spec.end
				return true
			})
			textArray.push(doc.eqn.slice(maxEnd, nextNode.to - offset - Number(isGroup)))
			if (nextNode.name === "Group") {
				const newc = nextNode.cursor()
				const res: string[] = []
				do {
					res.push(newc.name)
					} while (newc.next())
				// console.log(res)
			}
			specs.push([{
				start: nodeRef.from - offset,
				end: nextNode.to - offset,
				text: textArray.join(""),
				class: "cm-number",
				elementType: type,
			}])
			cursor.nextSibling() && cursor.prev();
		}
	} while (cursor.next() && count++ < 10000 && cursor.to <= topNode.to)
	// console.debug(count, specs.length, doc.eqn, topNode.name)
	// console.debug(nodes.map(node => [node.name,node.from,node.to]).join("\n"))

	return specs;
}

function moveNext(cursor: TreeCursor) {
	return;
	cursor.nextSibling() || (cursor.parent() && cursor.nextSibling())
	cursor.prev()
}

function handleNot(cursor: TreeCursor, doc: EquationText, specs: ConcealSpec[]) {
	const notFrom = cursor.from
	if (!cursor.next()) return
	if (!cursor.name.endsWith("Command")) {
		cursor.prev();
		return;
	}
	const to = cursor.to
	const offset = doc.offset
	const symbol = doc.slice(cursor.from + 1, cursor.to)
	const notSymbol = not_remap[symbol]
	if (notSymbol) {
		moveNext(cursor)
		specs.push([
			{
				start: notFrom - offset,
				end: to - offset,
				text: notSymbol,
			},
		])
	} else {
		cursor.prev();
	}
}

class EquationText {
	constructor(
		public readonly eqn: string,
		public readonly offset: number,
	) {}

	slice(from: number, to: number) {
		return this.eqn.slice(from - this.offset, to - this.offset);
	}

}

export type ConcealCachedEquations = Record<string, ConcealSpec[]>;
export function conceal2(
	view: EditorView,
	cached_equations: ConcealCachedEquations,
): { specs: ConcealSpec[]; cached_equations: ConcealCachedEquations } {
	const boundsPlugin = getMathBoundsPlugin(view);
	const [equations, bounds] = boundsPlugin.getEquations(view.state);
	const new_equations: typeof cached_equations = {};
	const tree = boundsPlugin.getTree(view.state)

	for (const [start, eqn] of equations.entries()) {
		if (eqn in cached_equations) {
			new_equations[eqn] = cached_equations[eqn];
			continue;
		}
		const bound = bounds.get(start)!;
		new_equations[eqn] = []
		if (!bound || !bound.tree) {
			console.error("No tree found for equation", eqn, "at position", start, "with bounds", bound)
			new_equations[eqn] = []
			continue
		}

		const localSpecs = traverseTree(bound.tree, new EquationText(eqn, bound.offset))
		// const localSpecs: never[] = [
			// ...concealSymbols(eqn, "\\^", "", map_super),
			// ...concealSymbols(eqn, "_", "", map_sub),
			// ...concealSymbols(eqn, "\\\\frac", "", fractions),
			// ...concealNotSymbols(eqn, ALL_SYMBOLS, not_remap),
			// ...concealSupSub(eqn, true, ALL_SYMBOLS),
			// ...concealSupSub(eqn, false, ALL_SYMBOLS),
			// ...concealModifier(eqn, "hat", "\u0302"),
			// ...concealModifier(eqn, "dot", "\u0307"),
			// ...concealModifier(eqn, "ddot", "\u0308"),
			// ...concealModifier(eqn, "overline", "\u0304"),
			// ...concealModifier(eqn, "bar", "\u0304"),
			// ...concealModifier(eqn, "tilde", "\u0303"),
			// ...concealModifier(eqn, "vec", "\u20D7"),
			// ...concealSymbols(eqn, "\\\\", "", brackets, "cm-bracket"),
			// ...concealAtoZ(eqn, "\\\\mathcal{", "}", mathscrcal),
			// ...concealModifiedGreekLetters(eqn, greek),
			// ...concealModified_A_to_Z_0_to_9(eqn, mathbb),
			// ...concealText(eqn),
			// ...concealBraKet(eqn),
			// ...concealSet(eqn),
			// ...concealFraction(eqn),
			// ...concealOperators(eqn, operators),
			// ...concealOperatorname(eqn),
		// ];
		new_equations[eqn] = localSpecs;
	}
	cached_equations = new_equations;

	// Make the 'start' and 'end' fields represent positions in the entire
	// document (not in a math expression)
	const specs: ConcealSpec[] = [];
	for (const [start, eqn] of equations.entries()) {
		if (!(eqn in new_equations)) {
			console.error("not found",eqn)
			console.error(equations, new_equations)
			continue
		}
		for (const spec of new_equations[eqn]) {
			specs.push(
				spec.map((replace) => ({
					...replace,
					start: replace.start + start,
					end: replace.end + start,
				})),
			);
		}
	}

	return { specs, cached_equations };
}
