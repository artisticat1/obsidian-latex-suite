import { globSync, readFileSync } from "fs";
import { readdir, readFile } from "fs/promises";
import path from "path";

const i18nFolder = "src/i18n/locales";
const enFolder = path.join(i18nFolder, "en");

async function main() {
	const promises: Promise<void>[] = []
	for (const file of globSync(`${enFolder}/*.json`)) {
		console.log(`Checking ${file}...`);
		const filename = path.basename(file);
		const enFile = readFileSync(path.join(enFolder, filename), "utf-8");
		const enJson = JSON.parse(enFile);
		for (const locale of await readdir(i18nFolder, {withFileTypes: true})) {
			if (!locale.isDirectory()) continue;
			if (locale.name === "en") continue;
			const localeFilePath = path.join(i18nFolder, locale.name, filename);

			promises.push(
				readFile(localeFilePath, "utf-8").then((file) => {
					const json = JSON.parse(file);
					const missingKeys = traverseKeys(enJson, json);
					if (missingKeys.length > 0) {
						console.log(`Missing keys in ${locale.name}/${filename}:`);
						for (const key of missingKeys) {
							console.log(`  ${key}`);
						}
					}
				}),
			);
		}
	}
	await Promise.all(promises);
}

interface RecursiveStringRecord {
	[key: string]: string | RecursiveStringRecord;
}

function traverseKeys(obj: RecursiveStringRecord, obj2: RecursiveStringRecord): string[] {
	const missingKeys: string[] = [];
	for (const key in obj) {
		if (typeof obj[key] === "string" && obj2[key] === undefined) {
			missingKeys.push(key);
		} else if (typeof obj[key] === "object") {
			const nestedMissingKeys = traverseKeys(obj[key] as RecursiveStringRecord, (obj2[key] ?? {}) as RecursiveStringRecord);
			missingKeys.push(...nestedMissingKeys.map(nestedKey => `${key}.${nestedKey}`));
		}
	}
	return missingKeys;
}

main();
