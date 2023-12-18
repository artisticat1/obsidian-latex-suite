
export interface Environment {
	openSymbol: string;
	closeSymbol: string;
}

export const EXCLUSIONS:{[trigger: string]: Environment} = {
	"([A-Za-z])(\\d)": {openSymbol: "\\pu{", closeSymbol: "}"},
	"->": {openSymbol: "\\ce{", closeSymbol: "}"}
}

