import { Options } from "./options";

export interface RawSnippet {
	trigger: string | RegExp;
	replacement: string;
	options: string;
	priority?: number;
	description?: string;
	flags?: string;
}

export class ParsedSnippet {
	trigger: string;
	replacement: string;
	options: Options;
	flags: string;
	priority?: number;
	description?: string;
	
	constructor(raw: RawSnippet) {
		// normalize regex triggers
		const resolved: RawSnippet = { ...raw, flags: raw.flags ?? "" };
		if (raw.trigger instanceof RegExp) {
			resolved.options = `r${raw.options}`;
			resolved.trigger = raw.trigger.source;
			// regex trigger flags and snippet flags get merged 
			resolved.flags = `${raw.trigger.flags}${resolved.flags}`;
		}

		// filter out invalid flags
		const validFlags = [
			// "d", // doesn't affect the search
			// "g", // doesn't affect the pattern match and is almost certainly undesired behavior
			"i",
			"m",
			"s",
			"u",
			"v",
			// "y", // almost certainly undesired behavior
		];
		resolved.flags = Array.from(new Set(resolved.flags.split("")))
			.filter(flag => validFlags.includes(flag))
			.join(""); 

		const parsed = {...resolved, options: Options.fromSource(resolved.options)};
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
