import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
    baseDirectory: "src",
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
	globalIgnores([
		"**/npm node_modules",
		"**/build",
		"src/default_snippet_variables.js",
		"src/default_snippets.js",
		"src/utils/debug.ts",
		"src/utils/vim_types.d.ts",
		"./main.js"
	]),
	{
		extends: compat.extends(
			"eslint:recommended",
			"plugin:@typescript-eslint/eslint-recommended",
			"plugin:@typescript-eslint/recommended",
		),

		plugins: {
			"@typescript-eslint": typescriptEslint,
		},
		files: ["src/**/*.ts"],

		languageOptions: {
			globals: {
				...globals.node,
			},

			parser: tsParser,
			ecmaVersion: 2016,
			sourceType: "module",
		},

		rules: {
			"no-unused-vars": "off",

			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "none",
				},
			],

			"@typescript-eslint/ban-ts-comment": "off",
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",
			quotes: ["warn", "double"],
		},
	},
]);
