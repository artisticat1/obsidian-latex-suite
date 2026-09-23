import * as v from "valibot"
const MacroAreaSchema = v.object({
	name: v.string(),
	arguments: v.optional(v.array(v.number())),
});
export type MacroArea = v.InferOutput<typeof MacroAreaSchema>;

export const MacroAreaPipeSchema = v.pipe(
		v.optional(v.array(v.union([v.string(), MacroAreaSchema])), []),
		v.mapItems((item) => (typeof item === "string" ? { name: item, arguments: [0] } : item)),
)
/**
 * List of environments where math commands are illegal to insert and where the environment is latex text instead.
 * Macros should only take up the arguments they actually take to avoid seeing `$\text{world}{\color{red}\alpha}$` the second argument of `text` as an argument of `text`.
 */
export const textArea = [
	{ name: "text", arguments: [0] },
	{ name: "textrm", arguments: [0] },
	{ name: "textup", arguments: [0] },
	{ name: "textit", arguments: [0] },
	{ name: "textbf", arguments: [0] },
	{ name: "textsf", arguments: [0] },
	{ name: "texttt", arguments: [0] },
	{ name: "textnormal", arguments: [0] },
	{ name: "clap", arguments: [0] },
	{ name: "textllap", arguments: [0] },
	{ name: "textrlap", arguments: [0] },
	{ name: "textclap", arguments: [0] },
	{ name: "hbox", arguments: [0] },
	{ name: "mbox", arguments: [0] },
	{ name: "fbox", arguments: [0] },
	{ name: "framebox", arguments: [0] },
	{ name: "colorbox", arguments: [1] }, // has 2 inputs \colorbox{color}{text}
	{ name: "fcolorbox", arguments: [2] }, // has 3 inputs \fcolorbox{color}{background-color}{text}
] as const satisfies readonly MacroArea[];

/**
 * List of environments where math commands are illegal to insert.
 * Here treating them as text also doesn't make sense so autocomplete/snippets are disabled for them.
 * Snippets with `includedMacros` can expand in these.
 */
export const snippetLessArea = [
	{ name: "tag", arguments: [0] },
	{ name: "begin", arguments: [0] },
	{ name: "end", arguments: [0] },
	{ name: "mmlToken", arguments: [0, 1] }, // MathML token, also has two inputs
	{ name: "unicode", arguments: [0] },
	{ name: "textcolor", arguments: [0] }, // only the first argument is text/color, the second argument is math
	{ name: "color", arguments: [0] },
	{ name: "colorbox", arguments: [0] }, // has two inputs \colorbox{color}{text}, color is snippetless and text is text.
	{ name: "fcolorbox", arguments: [0, 1] }, // has 3 inputs \fcolorbox{color}{background-color}{text}, of which the first 2 are snippetless and the last one is text.
	{ name: "operatorname", arguments: [0] },
	{ name: "style", arguments: [0] },
] as const satisfies readonly MacroArea[];

export const allTextAreas = [...textArea, ...snippetLessArea] as const;

/**
 * List of math fonts/ math commands. I don't know if they should treated as text since they are technically math environments.
 */
const mathFonts = [
	"label", // labels don't work properly in mathjax. See https://physics.meta.stackexchange.com/questions/5396/using-labels-with-mathjax, 
	// but labels can't be overwritten and everytime the equation is changed the label gets recompiled and the reference is lost till obsidian reloads itself.
	"ref", // math is allowed for some reason
	"eqref", // math is allowed for some reason
	"operatorname",
	"operatorname*",
	"DeclareMathOperator",
	"DeclareMathOperator*",
	"mathrm",    
	"mathup", 
	"mathnormal",
	"mathbf",    
	"mathbfup",  
	"mathit",    
	"mathbfit",  
	"mathbb",    
	"Bbb",       
	"mathfrak",  
	"mathbffrak",
	"mathscr",   
	"mathbfscr", 
	"mathsf",    
	"mathsfup",  
	"mathbfsf",  
	"mathbfsfup",
	"mathsfit",  
	"mathbfsfit",
	"mathtt",    
	"mathcal",   
	"mathbfcal", 
	"symrm",     
	"symup",     
	"symnormal", 
	"symbf",     
	"symbfup",   
	"symit",     
	"symbfit",   
	"symbb",     
	"symfrak",   
	"symbffrak", 
	"symscr",    
	"symbfscr",  
	"symsf",     
	"symsfup",   
	"symbfsf",   
	"symbfsfup", 
	"symsfit",   
	"symbfsfit", 
	"symtt",     
	"symcal",    
	"symbfcal",  
	"Bbb",
] as const;

export const mathFontsEnvsRaw = `[${mathFonts.map(env => `\n\t["${env}", "}"]`).join("")}\n]`;
