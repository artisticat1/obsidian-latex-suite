import { Options } from "./options";

export class RawSnippet {
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
		// normalize triggers as strings
		const override: RawSnippet = { ...raw };
		if (raw.trigger instanceof RegExp) {
			override.options = `r${raw.options}`;
			override.trigger = raw.trigger.source;
			override.flags = raw.trigger.flags;
		}

		// merge flags
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
		const resolvedFlags = Array.from(new Set(`${override.flags ?? ""}${raw.flags ?? ""}`.split("")))
			.filter(flag => validFlags.includes(flag))
			.join(""); 

		const parsed = {...raw, ...override, options: Options.fromSource(override.options), flags: resolvedFlags};
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
