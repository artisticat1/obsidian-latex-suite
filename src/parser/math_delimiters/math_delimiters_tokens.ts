import { ExternalTokenizer } from "@lezer/lr";
import {
	InlineStart,
	InlineEnd,
	DisplayStart,
	DisplayEnd,
	Dollar,
} from "./math-parser.terms.js";
import { dollarChar, IsEndInlineDelimiter } from "../html_math_delimiters/html-math_tokens.js";


export const mathTokens = new ExternalTokenizer((input, stack) => {
	// If the next character isn't a dollar sign, we have nothing to do here
	if (input.next !== dollarChar) return;
	if (stack.canShift(DisplayEnd) && input.peek(1) === dollarChar) {
		return input.acceptToken(DisplayEnd, 2);
	} else if (stack.canShift(InlineEnd)) {
		return input.acceptToken(InlineEnd, 1);
	} else if (stack.canShift(DisplayStart) && input.peek(1) === dollarChar) {
		return input.acceptToken(DisplayStart, 2);
	} else if (IsEndInlineDelimiter(stack, input)) {
		return input.acceptToken(InlineStart, 1);
	}
	return input.acceptToken(Dollar, 1);
});
