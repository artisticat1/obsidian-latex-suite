import { writeFileSync } from "fs";
import { connectToCdp } from "obsidian-integration-testing";


async function main() {
	await using conn = await connectToCdp();

	const macros = await conn.evalInObsidian({
		callback: async ({obsidianModule: {requestUrl}}) => {
			const response = await requestUrl({
					url: "https://docs.mathjax.org/en/v4.1/input/tex/macros/",
				})
				.then((res) => res.text);
			const parser = new DOMParser();
			const doc = parser.parseFromString(response, "text/html");
			const macros = Array.from(
				doc.querySelectorAll("td > p > code > span"),
			)
				.map((span) => span.textContent?.trim())
				.filter(Boolean)
				.filter(
					(text) =>
						text.startsWith("\\") &&
						/[a-zA-Z]/.test(text.at(1) || ""),
				);
			console.debug(JSON.stringify(macros, null, 4));
			return macros;
		},
	});
	const file = "src/snippets/luasnip_api/macros.ts";
	writeFileSync(
		file,
		`// all macros defined in mathjax v3.2
// in order to avoid accidental snippet expansion when typing a macro.

export const ALL_MACROS = ${JSON.stringify(macros, null, "\t")}
`,
	);
	console.debug(JSON.stringify(macros, null, 4));
}
main();
