import type { RawSnippet } from "./main";


export const options = ["T", "Tm", "Tn", "TM", "M", "n", "c", "m"] as const;
export const names = [
	["math-text", "T"],
	["math-text-specified", "Tm"],
	["inline-math-text", "Tn"],
	["display-math-text", "TM"],
	["display-math", "M"],
	["inline-math", "n"],
	["code", "c"],
	["math", "m"],
	["math-exclude-pu", "m"],
	["math-exclude-align", "m"],
	["math-include-begin", "m"],
	["math-include-color", "m"],
] as const;

const normal_name_options = [
	["math-text", "T"],
	["math-text-specified", "Tm"],
	["inline-math-text", "Tn"],
	["display-math-text", "TM"],
	["display-math", "M"],
	["inline-math", "n"],
	["code", "c"],
	["math", "m"],
] satisfies (typeof names)[number][];

type Spec = {
	text: string;
	pos: number;
	options: typeof names[number]["1"][];
	names: typeof names[number]["0"][];
}

export const transactionSpec: Spec[] = [
	{
		text: "$$\\text{}$$",
		pos: "$$\\text{".length,
		options: ["T", "Tm", "TM"],
		names: ["math-text", "math-text-specified", "display-math-text"],
	},
	{
		text: "$\\text{}$",
		pos: "$\\text{".length,
		options: ["T", "Tn", "Tm"],
		names: ["math-text", "inline-math-text", "math-text-specified"],
	},
	{
		text: "$$E=mc^a$$",
		pos: "$$E=mc^a".length,
		options: ["M", "m"],
		names: ["display-math", "math", "math-exclude-pu", "math-exclude-align"],
	},
	{
		text: "$a$",
		pos: "$a".length,
		options: ["n", "m"],
		names: ["inline-math", "math", "math-exclude-pu", "math-exclude-align"],
	},
	{
		text: "```\n\n```",
		pos: "```\n".length,
		options: ["c"],
		names: ["code"],
	},
	{
		text: "$$\\pu{}$$",
		pos: "$$\\pu{".length,
		options: ["M", "m"],
		names: ["display-math", "math", "math-exclude-align"],
	},
	{
		text: "$$\\begin{align}a&=b\\\\c&=d\\end{align}$$",
		pos: "$$\\begin{align}a&=b\\\\c&=d".length,
		options: ["M", "m"],
		names: ["display-math", "math", "math-exclude-pu"],
	},
	// snippetless envs
	{
		text: "$$\\begin{align}a&=b\\\\c&=d\\end{align}$$",
		pos: "$$\\begin{align".length,
		options: ["m"],
		names: ["math-include-begin"]
	},
	{
		text: "$$\\color{}$$",
		pos: "$$\\color{".length,
		options: ["m"],
		names: ["math-include-color"]
	}
];

let length = normal_name_options.length;
const snippets = (
	[
		...normal_name_options.slice(0, length).map((value, index) => ({
			trigger: index.toString(),
			replacement: "",
			options: value[1],
			name: value[0],
		})),
		{
			trigger: (length++).toString(),
			replacement: "",
			options: "m",
			name: "math-exclude-pu",
			excludedMacros: ["pu"],
		},
		{
			trigger: (length++).toString(),
			replacement: "",
			options: "m",
			name: "math-exclude-align",
			excludedEnvironments: ["align"],
		},
		{
			trigger: (length++).toString(),
			replacement: "",
			options: "m",
			name: "math-include-color",
			includedMacros: ["color"],
		},
		{
			trigger: (length++).toString(),
			replacement: "",
			options: "m",
			name: "math-include-begin",
			includedMacros: ["begin"],
		},
	] as const
).map(
	(snippet) =>
		({
			...snippet,
			trigger: new RegExp(`(?<!\\d)${snippet.trigger}`),
		}) as const,
) satisfies (Readonly<RawSnippet> & {
	readonly name: (typeof names)[number]["0"];
})[];

export default snippets;
