// Conceal functions

import { syntaxTree } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { getEquationBounds } from "src/utils/context";
import { findMatchingBracket } from "src/utils/editor_utils";
import { ConcealSpec, mkConcealSpec } from "./conceal";
import { greek, cmd_symbols, map_super, map_sub, fractions, brackets, mathscrcal, mathbb, operators } from "./conceal_maps";


function escapeRegex(regex: string) {
	const escapeChars = ["\\", "(", ")", "+", "-", "[", "]", "{", "}"];

	for (const escapeChar of escapeChars) {
		regex = regex.replaceAll(escapeChar, "\\" + escapeChar);
	}

	return regex;
}

/**
 * gets the updated end index to include "\\limits" in the concealed text of some conceal match,
 * if said match is directly followed by "\\limits"
 *
 * @param eqn source text
 * @param end index of eqn corresponding to the end of a match to conceal
 * @returns the updated end index to conceal
 */
function getEndIncludingLimits(eqn: string, end: number): number {
	const LIMITS = "\\limits";
	if (eqn.substring(end, end + LIMITS.length) === LIMITS) {
		return end + LIMITS.length;
	}
	return end;
}

function concealSymbols(eqn: string, prefix: string, suffix: string, symbolMap: {[key: string]: string}, className?: string, allowSucceedingLetters = true): ConcealSpec[] {
	const symbolNames = Object.keys(symbolMap);

	const regexStr = prefix + "(" + escapeRegex(symbolNames.join("|")) + ")" + suffix;
	const symbolRegex = new RegExp(regexStr, "g");


	const matches = [...eqn.matchAll(symbolRegex)];

	const specs: ConcealSpec[] = [];

	for (const match of matches) {
		const symbol = match[1];

		if (!allowSucceedingLetters) {
			// If the symbol match is succeeded by a letter (e.g. "pm" in "pmatrix" is succeeded by "a"), don't conceal

			const end = match.index + match[0].length;
			if (eqn.charAt(end).match(/[a-zA-Z]/)) {
				continue;
			}
		}

		const end = getEndIncludingLimits(eqn, match.index + match[0].length);

		specs.push(mkConcealSpec({
			start: match.index,
			end: end,
			text: symbolMap[symbol],
			class: className,
		}));
	}

	return specs;
}

function concealModifier(eqn: string, modifier: string, combiningCharacter: string): ConcealSpec[] {

	const regexStr = ("\\\\" + modifier + "{([A-Za-z])}");
	const symbolRegex = new RegExp(regexStr, "g");


	const matches = [...eqn.matchAll(symbolRegex)];

	const specs: ConcealSpec[] = [];

	for (const match of matches) {
		const symbol = match[1];

		specs.push(mkConcealSpec({
			start: match.index,
			end: match.index + match[0].length,
			text: symbol + combiningCharacter,
			class: "latex-suite-unicode",
		}));
	}

	return specs;
}

function concealSupSub(eqn: string, superscript: boolean, symbolMap: {[key: string]:string}): ConcealSpec[] {

	const prefix = superscript ? "\\^" : "_";
	const regexStr = prefix + "{([A-Za-z0-9\\()\\[\\]/+-=<>':;\\\\ *]+)}";
	const regex = new RegExp(regexStr, "g");

	const matches = [...eqn.matchAll(regex)];


	const specs: ConcealSpec[] = [];

	for (const match of matches) {

		const exponent = match[1];
		const elementType = superscript ? "sup" : "sub";


		// Conceal super/subscript symbols as well
		const symbolNames = Object.keys(symbolMap);

		const symbolRegexStr = "\\\\(" + escapeRegex(symbolNames.join("|")) + ")";
		const symbolRegex = new RegExp(symbolRegexStr, "g");

		const replacement = exponent.replace(symbolRegex, (a, b) => {
			return symbolMap[b];
		});


		specs.push(mkConcealSpec({
			start: match.index,
			end: match.index + match[0].length,
			text: replacement,
			class: "cm-number",
			elementType: elementType,
		}));
	}

	return specs;
}

function concealModified_A_to_Z_0_to_9(eqn: string, mathBBsymbolMap: {[key: string]:string}): ConcealSpec[] {

	const regexStr = "\\\\(mathbf|boldsymbol|underline|mathrm|text|mathbb){([A-Za-z0-9 ]+)}";
	const regex = new RegExp(regexStr, "g");

	const matches = [...eqn.matchAll(regex)];

	const specs: ConcealSpec[] = [];

	for (const match of matches) {
		const type = match[1];
		const value = match[2];

		const start = match.index;
		const end = start + match[0].length;

		if (type === "mathbf" || type === "boldsymbol") {
			specs.push(mkConcealSpec({
				start: start,
				end: end,
				text: value,
				class: "cm-concealed-bold",
			}));
		}
		else if (type === "underline") {
			specs.push(mkConcealSpec({
				start: start,
				end: end,
				text: value,
				class: "cm-concealed-underline",
			}));
		}
		else if (type === "mathrm") {
			specs.push(mkConcealSpec({
				start: start,
				end: end,
				text: value,
				class: "cm-concealed-mathrm",
			}));
		}
		else if (type === "text") {
			// Conceal _\text{}
			if (start > 0 && eqn.charAt(start - 1) === "_") {
				specs.push(mkConcealSpec({
					start: start - 1,
					end: end,
					text: value,
					class: "cm-concealed-mathrm",
					elementType: "sub",
				}));
			}
		}
		else if (type === "mathbb") {
			const letters = Array.from(value);
			const replacement = letters.map(el => mathBBsymbolMap[el]).join("");
			specs.push(mkConcealSpec({start: start, end: end, text: replacement}));
		}

	}

	return specs;
}

function concealModifiedGreekLetters(eqn: string, greekSymbolMap: {[key: string]:string}): ConcealSpec[] {

	const greekSymbolNames = Object.keys(greekSymbolMap);
	const regexStr = "\\\\(underline|boldsymbol){\\\\(" + escapeRegex(greekSymbolNames.join("|"))  + ")}";
	const regex = new RegExp(regexStr, "g");

	const matches = [...eqn.matchAll(regex)];

	const specs: ConcealSpec[] = [];

	for (const match of matches) {
		const type = match[1];
		const value = match[2];

		const start = match.index;
		const end = start + match[0].length;

		if (type === "underline") {
			specs.push(mkConcealSpec({
				start: start,
				end: end,
				text: greekSymbolMap[value],
				class: "cm-concealed-underline",
			}));
		}
		else if (type === "boldsymbol") {
			specs.push(mkConcealSpec({
				start: start,
				end: end,
				text: greekSymbolMap[value],
				class: "cm-concealed-bold",
			}));
		}
	}

	return specs;
}

function concealText(eqn: string): ConcealSpec[] {

	const regexStr = "\\\\text{([A-Za-z0-9-.!?() ]+)}";
	const regex = new RegExp(regexStr, "g");

	const matches = [...eqn.matchAll(regex)];

	const specs: ConcealSpec[] = [];

	for (const match of matches) {
		const value = match[1];

		const start = match.index;
		const end = start + match[0].length;

		specs.push(mkConcealSpec({
			start: start,
			end: end,
			text: value,
			class: "cm-concealed-mathrm cm-variable-2",
		}));

	}

	return specs;
}

function concealOperators(eqn: string, symbols: string[]): ConcealSpec[] {

	const regexStr = "(\\\\(" + symbols.join("|") + "))([^a-zA-Z]|$)";
	const regex = new RegExp(regexStr, "g");

	const matches = [...eqn.matchAll(regex)];

	const specs: ConcealSpec[] = [];

	for (const match of matches) {
		const value = match[2];

		const start = match.index;
		const end = getEndIncludingLimits(eqn, start + match[1].length);

		specs.push(mkConcealSpec({
			start: start,
			end: end,
			text: value,
			class: "cm-concealed-mathrm cm-variable-2",
		}));
	}

	return specs;
}

function concealAtoZ(eqn: string, prefix: string, suffix: string, symbolMap: {[key: string]: string}, className?: string): ConcealSpec[] {

	const regexStr = prefix + "([A-Z]+)" + suffix;
	const symbolRegex = new RegExp(regexStr, "g");


	const matches = [...eqn.matchAll(symbolRegex)];

	const specs: ConcealSpec[] = [];

	for (const match of matches) {
		const symbol = match[1];
		const letters = Array.from(symbol);
		const replacement = letters.map(el => symbolMap[el]).join("");

		specs.push(mkConcealSpec({
			start: match.index,
			end: match.index + match[0].length,
			text: replacement,
			class: className,
		}));
	}

	return specs;
}

function concealBraKet(eqn: string): ConcealSpec[] {
	const langle = "〈";
	const rangle = "〉";
	const vert = "|";

	const specs: ConcealSpec[] = [];

	for (const match of eqn.matchAll(/\\(braket|bra|ket){/g)) {
		// index of the "}"
		const contentEnd = findMatchingBracket(eqn, match.index, "{", "}", false);
		if (contentEnd === -1) continue;

		const commandStart = match.index;
		// index of the "{"
		const contentStart = commandStart + match[0].length - 1;

		const type = match[1];
		const left = type === "ket" ? vert : langle;
		const right = type === "bra" ? vert : rangle;

		specs.push(mkConcealSpec(
			// Hide the command
			{ start: commandStart, end: contentStart, text: "" },
			// Replace the "{"
			{ start: contentStart, end: contentStart + 1, text: left, class: "cm-bracket" },
			// Replace the "}"
			{ start: contentEnd, end: contentEnd + 1, text: right, class: "cm-bracket" },
		));
	}

	return specs;
}

function concealSet(eqn: string): ConcealSpec[] {
	const specs: ConcealSpec[] = [];

	for (const match of eqn.matchAll(/\\set\{/g)) {
		const commandStart = match.index;
		// index of the "{"
		const contentStart = commandStart + match[0].length - 1;

		// index of the "}"
		const contentEnd = findMatchingBracket(eqn, commandStart, "{", "}", false);
		if (contentEnd === -1) continue;

		specs.push(mkConcealSpec(
			// Hide "\set"
			{ start: commandStart, end: contentStart, text: "" },
			// Replace the "{"
			{ start: contentStart, end: contentStart + 1, text: "{", class: "cm-bracket" },
			// Replace the "}"
			{ start: contentEnd, end: contentEnd + 1, text: "}", class: "cm-bracket" },
		));
	}

	return specs;
}

function concealFraction(eqn: string): ConcealSpec[] {
	const concealSpecs: ConcealSpec[] = [];

	for (const match of eqn.matchAll(/\\(frac|dfrac|tfrac|gfrac){/g)) {
		// index of the closing bracket of the numerator
		const numeratorEnd = findMatchingBracket(eqn, match.index, "{", "}", false);
		if (numeratorEnd === -1) continue;

		// Expect there are no spaces between the closing bracket of the numerator
		// and the opening bracket of the denominator
		if (eqn.charAt(numeratorEnd + 1) !== "{") continue;

		// index of the closing bracket of the denominator
		const denominatorEnd = findMatchingBracket(eqn, numeratorEnd + 1, "{", "}", false);
		if (denominatorEnd === -1) continue;

		const commandStart = match.index;
		const numeratorStart = commandStart + match[0].length - 1;
		const denominatorStart = numeratorEnd + 1;

		concealSpecs.push(mkConcealSpec(
			// Hide "\frac"
			{ start: commandStart, end: numeratorStart, text: "" },
			// Replace brackets of the numerator
			{ start: numeratorStart, end: numeratorStart + 1, text: "(", class: "cm-bracket" },
			{ start: numeratorEnd, end: numeratorEnd + 1, text: ")", class: "cm-bracket"},
			// Add a slash
			{ start: numeratorEnd + 1, end: numeratorEnd + 1, text: "/", class: "cm-bracket" },
			// Replace brackets of the denominator
			{ start: denominatorStart, end: denominatorStart + 1, text: "(", class: "cm-bracket" },
			{ start: denominatorEnd, end: denominatorEnd + 1, text: ")", class: "cm-bracket" },
		));
	}

	return concealSpecs;
}

function concealOperatorname(eqn: string): ConcealSpec[] {
	const regexStr = "\\\\operatorname{([A-Za-z]+)}";
	const regex = new RegExp(regexStr, "g");
	const matches = [...eqn.matchAll(regex)];
	const specs: ConcealSpec[] = [];

	for (const match of matches) {
		const value = match[1];
		const start2 = match.index!;
		const end2 = start2 + match[0].length;

		specs.push(mkConcealSpec({
			start: start2,
			end: end2,
			text: value,
			class: "cm-concealed-mathrm cm-variable-2"
		}));
	}

	return specs;
}

export function conceal(view: EditorView): ConcealSpec[] {
	const specs: ConcealSpec[] = [];

	for (const { from, to } of view.visibleRanges) {

		syntaxTree(view.state).iterate({
			from,
			to,
			enter: (node) => {
				const type = node.type;
				const to = node.to;

				if (!(type.name.contains("begin") && type.name.contains("math"))) {
					return;
				}

				const bounds = getEquationBounds(view.state, to);
				if (!bounds) return;


				const eqn = view.state.doc.sliceString(bounds.start, bounds.end);


				const ALL_SYMBOLS = {...greek, ...cmd_symbols};

				const localSpecs = [
					...concealSymbols(eqn, "\\^", "", map_super),
					...concealSymbols(eqn, "_", "", map_sub),
					...concealSymbols(eqn, "\\\\frac", "", fractions),
					...concealSymbols(eqn, "\\\\", "", ALL_SYMBOLS, undefined, false),
					...concealSupSub(eqn, true, ALL_SYMBOLS),
					...concealSupSub(eqn, false, ALL_SYMBOLS),
					...concealModifier(eqn, "hat", "\u0302"),
					...concealModifier(eqn, "dot", "\u0307"),
					...concealModifier(eqn, "ddot", "\u0308"),
					...concealModifier(eqn, "overline", "\u0304"),
					...concealModifier(eqn, "bar", "\u0304"),
					...concealModifier(eqn, "tilde", "\u0303"),
					...concealModifier(eqn, "vec", "\u20D7"),
					...concealSymbols(eqn, "\\\\", "", brackets, "cm-bracket"),
					...concealAtoZ(eqn, "\\\\mathcal{", "}", mathscrcal),
					...concealModifiedGreekLetters(eqn, greek),
					...concealModified_A_to_Z_0_to_9(eqn, mathbb),
					...concealText(eqn),
					...concealBraKet(eqn),
					...concealSet(eqn),
					...concealFraction(eqn),
					...concealOperators(eqn, operators),
					...concealOperatorname(eqn)
				];

				// Make the 'start' and 'end' fields represent positions in the entire
				// document (not in a math expression)
				for (const spec of localSpecs) {
					for (const replace of spec) {
						replace.start += bounds.start;
						replace.end += bounds.start;
					}
				}

				specs.push(...localSpecs);
			},
		});
	}

	return specs;
}
