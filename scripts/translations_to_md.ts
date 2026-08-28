import fs from "fs"

const path = "src/i18n/locales/en";

const files = fs.readdirSync(path).filter((file) => file.endsWith(".json"));
for (const file of files) {
	const filePath = `${path}/${file}`;
	const data = fs.readFileSync(filePath, "utf-8");
	const jsonData = JSON.parse(data);
	const parsedData = parseKey(jsonData);
	const outputFilePath = `src/i18n/locales/en/${file.replace(".json", ".md")}`;
	fs.writeFileSync(outputFilePath, parsedData);
}

type TranslationValue = string | RecursiveRecord;

interface RecursiveRecord {
    [key: string]: TranslationValue;
}

function parseKey(translation: RecursiveRecord, depth=1): string {
	const result: string[] = []
	for (const [key, value] of Object.entries(translation)) {
		if (typeof value === "object" && value !== null) {
			result.push(`${"#".repeat(depth)} ${key}`);
			result.push(parseKey(value, depth + 1));
		} else if (typeof value === "string") {
			result.push(
`${"#".repeat(depth)} ${key}
${value}
`
			)
		}
	}
	return result.join("\n");
}
