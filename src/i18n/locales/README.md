# Instructions

- Fork the repo, and clone your fork locally.
- Update per below
- Submit a pull request

# UI strings translations

- Copy `src/i18n/locales/en` to ``src/i18n/locales/<insert-your-language-code>`
- Then translate the string either:
	- translate the json files directly, where every `desc` key is markdown and the rest is raw text.
	  It might be helpful to turn on word wrap in your editor because the json strings have to be in one line.
	- Or if you're more comfortable with markdown
		- run `npm install` to install the dependencies for the scripts
		- run `npx jiti scripts/translations_to_md.ts` to convert all json files to markdown
		- Translate the text after the headers. Whitespace at the beginning and end is ignored and only `desc` headers are rendered as markdown.
		- run `npx jiti scripts/translations_to_json.ts` to convert the markdown files back into json files.
