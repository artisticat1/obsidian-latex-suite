import { Input, NestedParse, parseMixed, SyntaxNode } from "@lezer/common";
import { parser as mathJaxParser } from "./mathjax/latex-parser";
import { parser as htmlMathDelimitersParser } from "./html_math_delimiters/html-parser";
import {
	BlockParser,
	InlineParser,
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
			console.debug(String.fromCharCode(ch));

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
const blockDisplayMathParser: BlockParser = {
	name: "math2",
	parse(cx, line) {
		const startPos = cx.lineStart;
		const startLine = line.text;
		if (!startLine || !startLine.startsWith("$$")) return false;
		console.debug(startLine)
		while (cx.nextLine()) {
			const currentLine = line.text
			console.debug(currentLine)
			if (currentLine && currentLine.startsWith("$$")) {
				const endPos = cx.lineStart;
				cx.addElement(
					cx.elt("DollarDisplayMath", startPos, endPos, [
						cx.elt("Dollar", startPos, startPos + 2),
						cx.elt("DisplayMath", startPos + 2, cx.lineStart),
						cx.elt("Dollar", cx.lineStart, endPos),
					]),
				);
				return true;
			}
		}
		console.log("peek", cx.peekLine())
		return false;
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
export const MathParser: MarkdownConfig = {
	defineNodes: [
		{ name: "InlineMath" },
		{ name: "DisplayMath" },
		{ name: "DollarDisplayMath"},
		{ name: "Dollar" },
		{ name: "DollarInlineMath" },
		{ name: "DollarDisplayMath" },
	],
	// parseInline: [universalMathParser],
	parseBlock: [blockDisplayMathParser],
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
	.configure({
		wrap: parseMixed((node): NestedParse | null => {
			if (["InlineMath", "DisplayMath"].includes(node.name)) {
				return { parser: mathJaxParser };
			}
			return null;
		}),
	})
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
