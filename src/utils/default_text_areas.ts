import * as v from "valibot"
export const MacroAreaSchema = v.object({
	name: v.string(),
	arguments: v.optional(v.array(v.number())),
});
export type MacroArea = v.InferOutput<typeof MacroAreaSchema>;
/**
 * List of environments where math commands are illegal to insert.
 * this is a mix of text and color environments where for example \color{#1} computes #1 as colorcode
 * and \textrm{#1} computes #1 as text.
 * All of these follow the same pattern of \command{#1} where #1 is the input. In rare cases it can be \command{#1}{#2}{#3}. These need to be handled seperately. So the Environment would be {openSymbol: `\command{`, closeSymbol: "}"}
 */
export const textArea = [
	{ name: "text" },
	{ name: "textrm" },
	{ name: "textup" },
	{ name: "textit" },
	{ name: "textbf" },
	{ name: "textsf" },
	{ name: "texttt" },
	{ name: "textnormal" },
	{ name: "clap" },
	{ name: "textllap" },
	{ name: "textrlap" },
	{ name: "textclap" },
	{ name: "hbox" },
	{ name: "mbox" },
	{ name: "fbox" },
	{ name: "framebox" },
	{ name: "textcolor", arguments: [0] }, // only the first argument is text/color, the second argument is math
	{ name: "color" },
	{ name: "colorbox" },
	{ name: "fcolorbox" }, // has two inputs \fcolorbox{color}{background}{text} needs seperate handling
] as const satisfies readonly MacroArea[];

/**
 * List of environments where math commands are illegal to insert.
 * Here treating them as text also doesn't make sense so autocomplete/snippets are disabled for them.
 */
export const snippetLessArea = [
	{ name: "tag" },
	{ name: "begin" },
	{ name: "end" },
	{ name: "mmlToken" }, // MathML token, also has two inputs
	{ name: "unicode" },
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
