import { Input, NestedParse, parseMixed, SyntaxNode } from "@lezer/common";
import { parser as mathJaxParser } from "./mathjax/latex-parser";
import { parser as htmlMathDelimitersParser } from "./html_math_delimiters/html-parser";
import {
	BlockContext,
	BlockParser,
	Element,
	InlineParser,
	LeafBlockParser,
	Line,
	MarkdownConfig,
	parser as baseParser,
} from "@lezer/markdown";
import { parser as mathOnlyParser } from "./math_delimiters/math-parser";

const dollar = "$".charCodeAt(0);
const universalMathParser: InlineParser = {
	name: "Math",
	parse(cx, next, pos) {
		// Check if we hit a dollar sign
		if (next !== dollar /* '$' */) return -1;

		// Check if it's double dollar ($$) vs single dollar ($)
		const isDisplay = cx.char(pos + 1) === dollar;
		const delimiterLength = isDisplay ? 2 : 1;
		const nodeName = isDisplay ? "DollarDisplayMath" : "DollarInlineMath";
		const innerName = isDisplay ? "DisplayMath" : "InlineMath";

		const startPos = pos;
		const contentStart = pos + delimiterLength;

		// Scan forward to find the matching closing delimiter
		for (let i = contentStart; i < cx.end; i++) {
			const ch = cx.char(i);
			console.debug("u: ", String.fromCharCode(ch));

			// Handle escaped dollar signs (\$); skip past them
			if (ch === 92 /* backslash */) {
				i++;
				continue;
			}
			if (ch === 10 /* newline */) {
				return -1
			}

			// Check for closing delimiter
			if (ch === dollar /* '$' */) {
				if (isDisplay) {
					// Display math needs to match a double dollar sign
					if (cx.char(i + 1) !== dollar) continue;

					const closingStart = i;
					const endPos = i + 2;

					return cx.addElement(
						cx.elt(nodeName, startPos, endPos, [
							cx.elt("Dollar", startPos, contentStart),
							cx.elt(innerName, contentStart, closingStart),
							cx.elt("Dollar", closingStart, endPos),
						]),
					);
				} else {
					// Inline math matches a single dollar sign
					const closingStart = i;
					const endPos = i + 1;

					return cx.addElement(
						cx.elt(nodeName, startPos, endPos, [
							cx.elt("Dollar", startPos, contentStart),
							cx.elt(innerName, contentStart, closingStart),
							cx.elt("Dollar", closingStart, endPos),
						]),
					);
				}
			}
		}

		// No matching delimiter found, let Lezer pass it up as plain text
		return -1;
	},
};

function isDisplayInline(line: string): null | { left: number; right: number }[] {
	const re = /(\\[\\$])|(\$\$.*?\$\$)/g
	const matches = Array.from(line.matchAll(re)).map((match) => {
		if (match[2]) {
			return { left: match.index, right: match.index + match[2].length }
		}
	}).filter(match => match !== undefined)
	return matches.length > 0 ? matches : null
}
const blockDisplayMathParser: BlockParser = {
	name: "math2",
	parse(cx: BlockContext, line: Line) {
		const startPos = cx.lineStart;
		const startLine = line.text;
		if (!startLine || startLine.trim() !== "$$") return false;
		console.debug(startLine)
		while (cx.nextLine()) {
			const currentLine = line.text
			console.debug(currentLine)
			if (currentLine && currentLine.startsWith("$$")) {
				const endPos = cx.lineStart;
				const element = cx.elt("DollarDisplayMath", startPos, endPos, [
						cx.elt("Dollar", startPos, startPos + 2),
						cx.elt("DisplayMath", startPos + 2, cx.lineStart),
						cx.elt("Dollar", cx.lineStart, endPos),
					])
				console.debug("element", element)
				cx.addElement( element);
				cx.nextLine();
				return true;
			}
		}
		console.log("peek", cx.peekLine())
		return false;
	},

	endLeaf(cx, line, leaf) {
		return line.text.trim().startsWith("$$")	
	},
	// leaf(cx, leaf) {
	// 	return leaf.content.startsWith("$$") ? {
	// 		nextLine: true,
	// 		finish
	// 	} : null
	// },
	// endLeaf(cx, line, leaf) {
	// 	const startPos = line.pos;
	// 	const startLine = leaf.content;
	// 	if (!startLine || !startLine.startsWith("$$")) return false;
	// 	do {
	// 		const currentLine = cx.peekLine();
	// 		if (currentLine && currentLine.startsWith("$$")) {
	// 			cx.nextLine();
	// 			const endPos = cx.lineStart;
	// 			cx.addElement(
	// 				cx.elt("DollarDisplayMath", startPos, endPos, [
	// 					cx.elt("Dollar", startPos, startPos + 2),
	// 					cx.elt("DisplayMath", startPos + 2, cx.lineStart),
	// 					cx.elt("Dollar", cx.lineStart, endPos),
	// 				]),
	// 			);
	// 			return true;
	// 		}
	// 	} while (cx.nextLine());
	// }
};
const a_char = "a".charCodeAt(0);
function isFencedCode(line: Line) {
	if (line.next != a_char) return -1
	let pos = line.pos + 1
	while (pos < line.text.length && line.text.charCodeAt(pos) == line.next) pos++
	if (pos < line.pos + 3) return -1
	return pos
}
function space(ch: number) {
	return ch == 32 || ch == 9 || ch == 10 || ch == 13
}
function skipSpaceBack(line: string, i: number, to: number) {
	while (i > to && space(line.charCodeAt(i - 1))) i--
	return i
}

function addCodeText(marks: Element[], from: number, to: number,cx: BlockContext) {
	const type = cx.parser.getNodeType("testCodeText") as number
	let last = marks.length - 1
	if (last >= 0 && marks[last].to == from && marks[last].type == type) (marks[last] as any).to = to
	else marks.push(cx.elt("testCodeText", from, to))
}
const FencedCode: BlockParser = {
	name: "testFencedCode",
	parse(cx, line) {
		console.debug("F", line.text)
		const fenceEnd = isFencedCode(line);
		if (fenceEnd < 0) return false;
		console.debug("fenceEnd", fenceEnd, line.text)
		let from = cx.lineStart + line.pos,
			ch = line.next,
			len = fenceEnd - line.pos;
		let infoFrom = line.skipSpace(fenceEnd),
			infoTo = skipSpaceBack(line.text, line.text.length, infoFrom);
		let marks: Element[] = [
			cx.elt("testCodeMark", from, from + len),
		];
		if (infoFrom < infoTo)
			marks.push(
				cx.elt(
					"testCodeInfo",
					cx.lineStart + infoFrom,
					cx.lineStart + infoTo,
				),
			);

		for (
			let first = true, empty = true, hasLine = false;
			cx.nextLine() && line.depth >= cx.stack.length;
			first = false
		) {
			let i = line.pos;
			if (line.indent - line.baseIndent < 4)
				while (i < line.text.length && line.text.charCodeAt(i) == ch)
					i++;
			if (i - line.pos >= len && line.skipSpace(i) == line.text.length) {
				for (let m of line.markers) marks.push(m);
				if (empty && hasLine)
					addCodeText(marks, cx.lineStart - 1, cx.lineStart, cx);
				marks.push(
					cx.elt(
						"testCodeMark",
						cx.lineStart + line.pos,
						cx.lineStart + i,
					),
				);
				cx.nextLine();
				break;
			} else {
				hasLine = true;
				if (!first) {
					addCodeText(marks, cx.lineStart - 1, cx.lineStart, cx);
					empty = false;
				}
				for (let m of line.markers) marks.push(m);
				let textStart = cx.lineStart + line.basePos,
					textEnd = cx.lineStart + line.text.length;
				if (textStart < textEnd) {
					addCodeText(marks, textStart, textEnd, cx);
					empty = false;
				}
			}
		}
		cx.addElement(
			cx.elt("testFencedCode", from, cx.lineStart, marks)
		)
		return true;
	},
	endLeaf(cx, line) {
		return isFencedCode(line) >= 0
	}
};


const leafDisplayMathParser: BlockParser = {
	name: "math3",
	leaf(cx, leaf): null | LeafBlockParser {
		return null
		let found = false;
		do {
			// console.debug(leaf.content, cx.peekLine())
			if (leaf.content.startsWith("$$")) {
				found = true;
				break
			}
		} while (cx.nextLine())
		if (!found) return null
		return {
			nextLine: (cx, line) => {
				console.debug("nextLine", line.text)
				return !line.text.trim().endsWith("$$")
			},
			finish: (cx, leaf) => {
				console.log("finish")
				if (!leaf.content.trim().endsWith("$$")) {
					return false
				}
				const startPos = cx.lineStart - leaf.content.length;
				const endPos = leaf.start + leaf.content.length;
				cx.addElement(
					cx.elt("DollarDisplayMath", startPos, endPos, [
						cx.elt("Dollar", startPos, startPos + 2),
						cx.elt("DisplayMath", startPos + 2, endPos - 2),
						cx.elt("Dollar", endPos - 2, endPos),
					]),
				);
				return true;
			}
		}
	},
	// endLeaf(cx, line, leaf) {
	// 	//TODO
	// }
}

export const MathParser: MarkdownConfig = {
	defineNodes: [
		{ name: "InlineMath" },
		{ name: "DisplayMath" },
		{ name: "DollarDisplayMath"},
		{ name: "Dollar" },
		{ name: "DollarInlineMath" },
		{ name: "DollarDisplayMath" },
	],
	parseInline: [universalMathParser],
	parseBlock: [blockDisplayMathParser],
};

const testFencedCodeParser: MarkdownConfig = {
	defineNodes: [
		{ name: "testFencedCode", block: true },
		{ name: "testCodeMark" },
		{ name: "testCodeInfo" },
		{ name: "testCodeText" },
	],
	parseBlock: [FencedCode],
};
const mathConfiguredOnlyParser = mathOnlyParser.configure({
	wrap: parseMixed(function parseMix(node): NestedParse | null {
		if (["InlineMath", "DisplayMath"].includes(node.name)) {
			return { parser: mathJaxParser };
		}
		return null;
	}),
});

const htmlMathConfiguredParser = htmlMathDelimitersParser.configure({
	wrap: parseMixed(function parseMix(node): NestedParse | null {
		if (["InlineMath", "DisplayMath"].includes(node.name)) {
			return { parser: mathJaxParser };
		}
		return null;
	}),
});

export const fullMathParser = baseParser
	// .configure({
	// 	wrap: parseMixed((node): NestedParse | null => {
	// 		if (node.name === "CodeText") {
	// 			return { parser: mathConfiguredOnlyParser };
	// 		}
	// 		return null;
	// 	}),
	// })
	.configure(MathParser)
	// .configure({
	// 	wrap: parseMixed((node): NestedParse | null => {
	// 		if (["InlineMath", "DisplayMath"].includes(node.name)) {
	// 			return { parser: mathJaxParser };
	// 		}
	// 		return null;
	// 	}),
	// })
	// .configure({
	// 	wrap: parseMixed(parseSpanAndLinkHtmlTags()),
	// })

// function parseSpanAndLinkHtmlTags() {
// 	return (node: SyntaxNode, input: Input): NestedParse | null => {
// 		if (node.name === "HTMLTag") {
// 			const tagText = input.read(node.from, node.to);
// 			if (tagText.startsWith("<span") || tagText.startsWith("<a")) {
// 				return {
// 					parser: htmlMathConfiguredParser,
// 					overlay: (nextNode: SyntaxNode) => ({
// 						from: node.to,
// 						to: nextNode.from,
// 					}),
// 				};
// 			}
// 		}
// 		return null;
// 	};
// }
