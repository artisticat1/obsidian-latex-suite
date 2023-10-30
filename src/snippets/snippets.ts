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
		// normalize regex triggers
		const override: RawSnippet = { ...raw, flags: raw.flags ?? "" };
		if (raw.trigger instanceof RegExp) {
			override.options = `r${raw.options}`;
			override.trigger = raw.trigger.source;
			override.flags = `${raw.trigger.flags}${override.flags}`;
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
		override.flags = Array.from(new Set(`${override.flags ?? ""}`.split("")))
			.filter(flag => validFlags.includes(flag))
			.join(""); 

		const parsed = {...override, options: Options.fromSource(override.options)};
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
