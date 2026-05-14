import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import obsidianmd from "eslint-plugin-obsidianmd";

const compat = new FlatCompat({
    baseDirectory: "src",
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
	globalIgnores([
		"**/node_modules",
		"src/default_snippet_variables.js",
		"src/default_snippets.js",
		"src/utils/debug.ts",
		"./main.js",
		"version-bump.mjs",
		"tests/**",
	]),
	obsidianmd.configs.recommended,
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
			parserOptions: {
				project: "./tsconfig.json",
			},
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
			// following rules are disabled because of this being a "codemirror" extension mostly and obsidian has a lot of rules against it and other opionated rules that should be handled by typescript itself or are not relevant.
			// "@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			// "@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			// "obsidianmd/prefer-create-el": "off",
			// "@typescript-eslint/only-throw-error": "off",
			// "@microsoft/sdl/no-inner-html": "off",
			// "obsidianmd/prefer-active-doc": "off",
			// way too many false positives.
			"obsidianmd/ui/sentence-case": "off",
			// "no-restricted-globals": "off",
			"@typescript-eslint/no-deprecated": "off",
			"no-unsanitized/method": "off",
			"obsidianmd/prefer-abstract-input-suggest": "off"
		},
	},
]);
