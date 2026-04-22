import dts from "rollup-plugin-dts";

export default [
	{
		input: "src/main.ts",
		output: [{ file: "api.d.ts" }],
		plugins: [dts()],
	},
];
