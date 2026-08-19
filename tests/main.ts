import LatexSuitePlugin from "../src/main";
import { fullMathParser } from "../src/parser/mathjax-parser";
import { conceal } from "../src/editor_extensions/conceal_fns";

export default class TestPlugin extends LatexSuitePlugin {
	test = {
		parser: fullMathParser,
		conceal,
	}	
}
