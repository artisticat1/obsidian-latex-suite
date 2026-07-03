import { ExternalTokenizer, InputStream, Stack } from "@lezer/lr";
import {
	InlineStart,
	InlineEnd,
	DisplayStart,
	DisplayEnd,
	Dollar,
} from "./html-parser.terms.js";

export function char(ch: string) {
	return ch.charCodeAt(0);
}
export const dollarChar = char("$");
const newline = char("\n");

export const mathTokens = new ExternalTokenizer((input, stack) => {
	// If the next character isn't a dollar sign, we have nothing to do here
	if (input.next !== dollarChar) return;
	if (stack.canShift(DisplayEnd) && input.peek(1) === dollarChar) {
		return input.acceptToken(DisplayEnd, 2);
	} else if (stack.canShift(InlineEnd)) {
		return input.acceptToken(InlineEnd, 1);
	} else if (stack.canShift(DisplayStart) && input.peek(1) === dollarChar) {
		const endDollarIndex = isDollarInTheSameLine(input);
		if (endDollarIndex === null || input.peek(endDollarIndex + 1) === -1) {
			return input.acceptToken(Dollar, 1);
		}
		return input.acceptToken(DisplayStart, 2);
	} else if (IsEndInlineDelimiter(stack, input)) {
		return input.acceptToken(InlineStart, 1);
	}
	return input.acceptToken(Dollar, 1);
});

export function IsEndInlineDelimiter(stack: Stack, input: InputStream): boolean {
	if (!stack.canShift(InlineEnd) || input.peek(1) === -1) {
		return false;
	}
	const endDollarIndex = isDollarInTheSameLine(input);
	if (endDollarIndex === null) {
		return false;
	}
	const nextChar =
		input.peek(endDollarIndex + 1) === -1
			? ""
			: String.fromCodePoint(input.peek(endDollarIndex + 1));
	if (/\d/.test(nextChar)) {
		return false;
	}
	return true
}

function isDollarInTheSameLine(input: InputStream): null | number {
	let i = 1;
	const whitespace = /\s/;
	if (whitespace.test(String.fromCharCode(input.peek(i)))) {
		return null;
	}
	while (
		input.peek(i) !== dollarChar &&
		input.peek(i) !== newline &&
		input.peek(i) !== -1
	) {
		i++;
	}
	if (whitespace.test(String.fromCharCode(input.peek(i)))) {
		return null;
	}
	return i;
}
