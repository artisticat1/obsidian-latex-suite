import { Options } from "./options";

export class RawSnippet {
	trigger: string;
	replacement: string;
	options: string;
	priority?: number;
	description?: string;
}

export class ParsedSnippet {
	trigger: string;
	replacement: string;
	options: Options;
	priority?: number;
	description?: string;

	constructor(raw: RawSnippet) {
		const parsed = {...raw, options: Options.fromSource(raw.options)};
		Object.assign(this, parsed);
	}
}

export interface Environment {
	openSymbol: string,
	closeSymbol: string
}

export const EXCLUSIONS:{[trigger: string]: Environment} = {
	"([A-Za-z])(\\d)": {openSymbol: "\\pu{", closeSymbol: "}"},
	"->": {openSymbol: "\\ce{", closeSymbol: "}"}
}
