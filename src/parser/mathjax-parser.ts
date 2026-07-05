import { parseMixed, SyntaxNode } from "@lezer/common";
import { parser as mathJaxParser } from "./mathjax/latex-parser";
import {
	BlockContext,
	BlockParser,
	Element,
	InlineParser,
	Line,
	MarkdownConfig,
	parser as baseParser,
} from "@lezer/markdown";

declare module "@lezer/markdown" {
	interface Line {
		markers?: Element[];
	}
}
export class Type {
	static readonly InlineMath = "InlineMath";
	static readonly DisplayMath = "DisplayMath";
	static readonly Dollar = "Dollar";
	static readonly DollarInlineMath = "DollarInlineMath";
	static readonly DollarDisplayMath = "DollarDisplayMath";
	static readonly DollarDisplayBlockMath = "DollarDisplayMath";
}

const inlineParserDisplayAndInlineMath: InlineParser = {
	name: "Math",
	parse(cx, next, pos) {
		if (next !== 36 /* '$' */) return -1;

		const isDisplay = cx.char(pos + 1) === 36 /* '$' */;
		const delimiterLength = isDisplay ? 2 : 1;
		const nodeName = isDisplay ? Type.DollarDisplayMath : Type.DollarInlineMath
		const innerName = isDisplay ? Type.DisplayMath : Type.InlineMath

		const startPos = pos;
		const contentStart = pos + delimiterLength;

		for (let i = contentStart; i < cx.end; i++) {
			const ch = cx.char(i);

			if (ch === 92 /* backslash */) {
				i++;
				continue;
			} else if (ch === 10 /* newline */) {
				return -1;
			} else if (ch !== 36 /* '$' */) {
				continue;
			}

			if (isDisplay) {
				// Display math needs to match a double dollar sign
				if (cx.char(i + 1) !== 36 /* '$' */) continue;
			}
			const closingStart = i;
			const endPos = i + delimiterLength;

			return cx.addElement(
				cx.elt(nodeName, startPos, endPos, [
					cx.elt(Type.Dollar, startPos, contentStart),
					cx.elt(innerName, contentStart, closingStart),
					cx.elt(Type.Dollar, closingStart, endPos),
				]),
			);
		}

		return -1;
	},
};

/**
 * Parsed just like ```.
 */
function isDisplayBlockStart(line: Line): number {
	if (line.next !== 36 /* '$' */) return -1
	if (line.indent - line.baseIndent > 3) return -1
	let pos = line.pos + 1;
	while (pos < line.text.length && line.text.charCodeAt(pos) == line.next) {
		pos++
	}
	if (pos < line.pos + 2) return -1
	for (let i = pos; i < line.text.length; i++) {
		if (line.text.charCodeAt(i) === 36 /* '$' */) return -1
	}
	return pos
}

/**
 * Just like ``` ending again except [^$\n] are allowed before the ending $$
 * $$ has to be the same or more than the starting $$ and only whitespace after is allowed.
 */
function isDisplayBlockEnd(line: Line, length: number): [number, number] | null {
	let startPos = line.pos
	while (
		startPos < line.text.length &&
		line.text.charCodeAt(startPos) !== 36 /* '$' */
	) {
		startPos++;
	}

	let pos = startPos
	while (pos < line.text.length && line.text.charCodeAt(pos) === 36 /* '$' */) {
		pos++;
	}
	return pos - startPos >= length && line.skipSpace(pos) === line.text.length
		? [startPos, pos]
		: null
}



type CustomElement = Element | {
	from: number;
	to: number;
	kind: string;
}

function addDisplayMath(markers: CustomElement[], from: number, to: number, cx: BlockContext) {
	const last = markers.length - 1;
	if (
		last >= 0 &&
		markers[last].to === from &&
		!(markers[last] instanceof Element)
	) {
		markers[last].to = to
	} else {
		markers.push({ from, to, kind: Type.DisplayMath });
	}
}

const blockParserDisplayMath: BlockParser = {
	name: "DisplayMath",
	parse(cx: BlockContext, line: Line) {
		const dollarEnd = isDisplayBlockStart(line);
		if (dollarEnd < 0) return false;
		const startDollar = line.pos
		const delimiterLength = dollarEnd - startDollar;

		const startPos = cx.lineStart + startDollar;
		const firstEqChar = line.skipSpace(dollarEnd);
		let endLine = line.text.length + cx.lineStart
		const markers: CustomElement[] = [
			cx.elt(Type.Dollar, startPos, cx.lineStart + dollarEnd),
		];
		if (firstEqChar < line.text.length) {
			const from = cx.lineStart + firstEqChar;
			const to = cx.lineStart + line.text.length + 1;
			addDisplayMath(markers, from, to, cx);
		}

		while (cx.nextLine()) {
		    endLine = line.text.length + cx.lineStart
			const endDollar = isDisplayBlockEnd(line, delimiterLength);
			if (endDollar !== null) {
				for (const m of line.markers ?? []) markers.push(m);
				const endFrom = cx.lineStart + endDollar[0];
				const endTo = cx.lineStart + endDollar[1];
				if (cx.lineStart + line.pos < endFrom) {
					addDisplayMath(
						markers,
						cx.lineStart + line.pos,
						endFrom,
						cx,
					);
				}
				markers.push(cx.elt(Type.Dollar, endFrom, endTo));
				cx.nextLine();
				break
			}
			const from = line.pos + cx.lineStart
			const to  = cx.lineStart + line.text.length + 1
			for (const m of line.markers ?? []) markers.push(m);
			addDisplayMath(markers, from, to, cx)
		}
		const InBetweenElements = markers.map((marker) =>
			marker instanceof Element
				? marker
				: cx.elt(Type.DisplayMath, marker.from, marker.to),
		);
		const element = cx.elt(
			Type.DollarDisplayBlockMath,
			startPos,
			endLine,
			InBetweenElements,
		);
		cx.addElement(element);
		return true;
	},
	after: "OrderedList",

	endLeaf(_cx, line) {
		return isDisplayBlockStart(line) >= 0
	},
};


export const MathParser: MarkdownConfig = {
	defineNodes: [
		{ name: Type.InlineMath },
		{ name: Type.DisplayMath },
		{ name: Type.DollarDisplayMath },
		{ name: Type.Dollar },
		{ name: Type.DollarInlineMath },
		{ name: Type.DollarDisplayMath },
		{ name: Type.DollarDisplayBlockMath },
	],
	parseInline: [inlineParserDisplayAndInlineMath],
	parseBlock: [blockParserDisplayMath],
	wrap: parseMixed((node) => {
		if (node.name === Type.InlineMath) {
			return { parser: mathJaxParser, bracketed: true };
		} else if (
			node.name === Type.DollarDisplayBlockMath ||
			node.name === Type.DollarDisplayMath
		) {
			return {
				parser: mathJaxParser,
				overlay: (node: SyntaxNode) => node.name === Type.DisplayMath,
				bracketed: true,
			};
		}
		return null;
	}),
};

export const fullMathParser = baseParser.configure(MathParser);
