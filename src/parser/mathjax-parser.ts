import { NestedParse, parseMixed, SyntaxNode } from "@lezer/common";
import { parser as mathJaxParser } from "./latex-parser";
import { InlineParser, MarkdownConfig, parser as baseParser } from "@lezer/markdown";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { parser as mathOnlyParser } from "./math-parser";
import { modifiedSyntaxTree } from "./language_helper";

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

      // Handle escaped dollar signs (\$); skip past them
      if (ch === 92 /* backslash */) {
        i++;
        continue;
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
            ])
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
            ])
          );
        }
      }
    }

    // No matching delimiter found, let Lezer pass it up as plain text
    return -1;
  }
};
export const MathParser: MarkdownConfig = {
	defineNodes: [
		{ name: "InlineMath" },
		{ name: "DisplayMath", block: true },
		{ name: "DollarDisplayMath", block: true },
		{ name: "Dollar" },
		{ name: "DollarInlineMath" },
		{ name: "DollarDisplayMath" },
	],
	parseInline: [universalMathParser],
};

const mathConfiguredOnlyParser = mathOnlyParser.configure({
	wrap: parseMixed(function parseMix(node): NestedParse | null {
		if (["InlineMath","DisplayMath"].includes(node.name)) {
			return { parser: mathJaxParser };
		} 
		return null;
	})
})
export function fullMathParser() {
	return baseParser
		.configure({
			wrap: parseMixed((node): NestedParse | null => {
				if (node.name === "CodeText") {
					// const debug = true
					// if (debug) {
					// 	return { parser: mathConfiguredOnlyParser };
					// }
					return { parser: mathOnlyParser };
				}
				return null;
			}),
		})
		.configure({
			wrap: parseMixed((node): NestedParse | null => {
				if (["InlineMath", "DisplayMath"].includes(node.name)) {
					return { parser: mathJaxParser };
				}
				return null;
			}),
		});
}

export const mathParserPlugin = ViewPlugin.fromClass(
	class {
		update(update: ViewUpdate) {
			if (!update.docChanged) return;
			try {
				const tree = modifiedSyntaxTree(update.state);
				// _printNode2(tree.topNode);
			} catch (e) {
				console.error(e)
			}
		}
	},
);
export function _printNode2(node: SyntaxNode) {
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
		result
			.map(
				({ name, from, to, indent, id }) =>
					`${"  ".repeat(indent)}${name}: (${from}, ${to}): `,
			)
			.join("\n"),
	);
}
