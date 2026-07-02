import { ExternalTokenizer } from "@lezer/lr";
import {
	InlineStart,
	InlineEnd,
	DisplayStart,
	DisplayEnd,
	Dollar,
} from "./math-parser.terms.js";

function char(ch: string) {
	return ch.charCodeAt(0);
}
const dollarChar = char("$");
const newline = char("\n");

export const mathTokens = new ExternalTokenizer((input, stack) => {
	// If the next character isn't a dollar sign, we have nothing to do here
	if (input.next !== dollarChar) return;
	if (stack.canShift(DisplayEnd) && input.peek(1) === dollarChar) {
		return input.acceptToken(DisplayEnd, 2);
	} else if (stack.canShift(InlineEnd)) {
		return input.acceptToken(InlineEnd, 1);
	} else if (stack.canShift(DisplayStart) && input.peek(1) === dollarChar) {
		return input.acceptToken(DisplayStart, 2);
	} else if (stack.canShift(InlineStart) && input.peek(1) !== -1) {
		let i = 1;
		const whitespace = /\s/;
		if (whitespace.test(String.fromCharCode(input.peek(i)))) {
			return input.acceptToken(Dollar, 1);
		}
		while (input.peek(i) !== dollarChar && input.peek(i) !== newline && input.peek(i) !== -1) {
			i++;
		}
		if (whitespace.test(String.fromCharCode(input.peek(i)))) {
			return input.acceptToken(Dollar, 1);
		}
		const nextChar = input.peek(i+1) === -1 ? "" : String.fromCodePoint(input.peek(i+1));
		if (/\d/.test(nextChar)) {
			return input.acceptToken(Dollar, 1);
		}
		return input.acceptToken(InlineStart, 1);
	}
	console.log(stack.canShift(InlineEnd))
	return input.acceptToken(Dollar, 1);
});
