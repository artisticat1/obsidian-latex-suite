# Prerequisites
- git installation
- npm (or some other package manager).

# Instructions

- Fork the repo, and clone your fork locally.
- Create a new branch locally, push it and create a draft PR, indicating you are working on translating a language.
- Update per below
- Submit a pull request

# UI strings translations

- Copy `src/i18n/locales/en` to `src/i18n/locales/<insert-your-language-code>`
- Then translate the string either:
	- Translate the JSON files directly, where some `name` for the settings is always raw text and the others might be HTML.
	  It might be helpful to turn on word wrap in your editor because the JSON strings have to be in one line.
	- Or if you're more comfortable with Markdown:
		- Run `npm install` to install the dependencies for the scripts
		- Run `npx jiti scripts/translations_to_md.ts` to convert all JSON files to Markdown.
		- Translate the text after the headers. Whitespace at the beginning and end is ignored.
		- Run `npx jiti scripts/translations_to_json.ts` to convert the Markdown files back into JSON files.

- Add `i18next.addResourceBundle("en", "settings", resources.en.settings)` to `src/main.ts`, where you replace "en" with your 2-letter language code, below the line that has `i18next.addResourceBundle("en", "settings", resources.en.settings)`.
- In `src/i18n/resources.ts` add `import en_settings from "./locales/en/settings.json"` at the top and 
```js
en: {
	settings: en_settings,
},
```
where you replace `en` with your language code.

To see the translations in obsidian:
- Use/create a dummy/dev vault where the files/data don't matter
- Clone this repo inside `path/to/vault/.obsidian/plugins` such that it creates a folder `obsidian-latex-suite` inside.
- In `obsidian-latex-suite` run:
	- `npm install` to install the dependencies
	- `npm run dev` to compile the plugin and recompile if any file changes.
- Enable Latex Suite and run the command `Reload Obsidian without saving` to reload the plugin after you made a change to the source code (or use the hotreload plugin).
- Change the language of obsidian to the language you're translating

If any issues arise, feel free to ask them in the PR or create a discussion.
The maintainers will be able to fix any issue not related to the translation itself.

