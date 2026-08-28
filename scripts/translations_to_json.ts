import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import type { Root } from "mdast";
import fs from "fs"

const parser = unified().use(remarkParse)
const stringify = unified().use(remarkStringify)


const path = "src/i18n/locales/en";

const files = fs.readdirSync(path).filter((file) => file.endsWith(".md"));
async function main() {
	for (const file of files) {
		const filePath = `${path}/${file}`;
		const data = fs.readFileSync(filePath, "utf-8");
		const parsedData = await parseData(data)
		const outputFilePath = `src/i18n/locales/en/${file.replace(".md", ".json")}`;
		fs.writeFileSync(outputFilePath, parsedData);
	}
}

async function parseData(data: string): Promise<string> {
	const tree = parser.parse(data)
	return parseNodes(tree, data)
}

type TranslationValue = string | RecursiveRecord;

interface RecursiveRecord {
    [key: string]: TranslationValue;
}

async function parseNodes(tree: Root, source: string) {
	const result: RecursiveRecord = {}
	const keys: string[] = ["root"];
	let start = 0;
	let previous_heading = true
	for (const node of tree.children) {
		if (node.type !== "heading") {
			previous_heading = false
			continue
		} else if (node.position === undefined) {
			throw new Error("unexpected position")
		}
		const pos_start = node.position.start
		const pos_end = node.position.end
		const start_offset = pos_start.offset
		const end_offset = pos_end.offset
		if (start_offset === undefined || end_offset === undefined) {
			throw new Error("unexpected offset")
		}
		if (!previous_heading) {
			insert_text(result, keys, source, start, start_offset);
		}
		start = end_offset;


		const children = node.children
		const textNode = children[0]
		if (children.length !== 1 || textNode.type !== "text") {
			throw new Error("Headings must only contain text")
		}
		keys.length = node.depth
		keys.push(textNode.value)
		previous_heading = true
	}
	insert_text(result, keys, source, start, source.length)
	return JSON.stringify(result["root"], null, 4).replaceAll(/^((?: {4})+)/gm, (match) => "\t".repeat(match.length/4)) + "\n"
}

main()
function insert_text(result: RecursiveRecord, keys: string[], source: string, start: number, start_offset: number) {
	let obj: RecursiveRecord = result;
	let key: string = keys[0];
	for (let i = 0; i < keys.length - 1; i++) {
		key = keys[i];
		obj[key] = obj[key] ?? {};
		const value = obj[key];
		if (typeof value === "string") {
			console.log(obj, key);
			throw "Unexpected string value in object, expected nested object. Headers can only contain other headers or text, not both.";
		} else {
			obj = value;
		}
	}
	obj[keys[keys.length - 1]] = source.slice(start, start_offset).trim();
}
