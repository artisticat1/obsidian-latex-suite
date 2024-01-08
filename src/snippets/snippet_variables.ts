export type SnippetVariables = Record<string, string>;

export function getSnippetVariables(snippetVarsStr: string): SnippetVariables {
	let vars: SnippetVariables = {};

	try {
		vars = JSON.parse(snippetVarsStr);
	}
	catch (e) {
		console.log(e);
	}

	return vars;
}