/**
 * List of environments where math can NEVER be inserted.
 * this is a mix of text and math environments where for example \color{#1} computes #1 as colorcode
 * and \textrm{#1} computes #1 as text.
 * All of these follow the same pattern of \command{#1} where #1 is the input. In rare cases it can be \command{#1}{#2}{#3}. These need to be handled seperately. So the Environment would be {openSymbol: `\command{`, closeSymbol: "}"}
 * @type {Array<string>}
 */
export const textArea: Array<string> = [
	"text",
	"textrm",
	"textup",
	"textit",
	"textbf",
	"textsf",
	"texttt",
	"textnormal",
	"clap",
	"textllap",
	"textrlap",
	"textclap",
	"hbox",
	"mbox",
	"fbox",
	"framebox",
	"begin",
	"end",
	"tag",
	"colorbox",
	"fcolorbox", // has two inputs \fcolorbox{color}{background}{text} needs seperate handling
	"unicode",
	"mmlToken", // MathML token, also has two inputs
];

/**
 * List of math fonts/ math commands. I don't know if they should treated as text since they are technically math environments.
 */
export const mathFonts: Array<string> = [
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
];
