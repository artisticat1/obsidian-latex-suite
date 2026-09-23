import { EditorState } from "@codemirror/state";
import { RawSnippet } from "../main";
export const files = [
	{
		path: "math.md",
		content: "This is a math note.",
	},
	{
		path: "text.md",
		content: "This is a text note.",
	},
	{
		path: "tag.md",
		content: "#math This is a note with #math tag.",
	},
] as const;
type FileSnippet = RawSnippet & {
	files: { [P in (typeof files)[number]["path"]]: boolean };
};
let snippetId = 0;
function getTrigger() {
	return new RegExp(`(?<!\\d)${snippetId++}`);
}
export default [
	{
		trigger: getTrigger(),
		replacement: "",
		options: "",
		includedPaths: "**/*math.md",
		description: "single glob pattern",
		files: {
			"math.md": true,
			"text.md": false,
			"tag.md": false,
		},
	},
	{
		trigger: getTrigger(),
		replacement: "",
		options: "",
		includedPaths: ({ state }: { state: EditorState }) =>
			state.doc.toString().includes("#math"),
		description: "function that returns boolean",
		files: {
			"math.md": false,
			"text.md": false,
			"tag.md": true,
		},
	},
	{
		trigger: getTrigger(),
		replacement: "",
		options: "",
		includedPaths: [
			"**/*math.md",
			({ state }: { state: EditorState }) =>
				state.doc.toString().includes("#math"),
		],
		description: "mixed function and glob pattern",
		files: {
			"math.md": true,
			"text.md": false,
			"tag.md": true,
		},
	},
] satisfies FileSnippet[];
