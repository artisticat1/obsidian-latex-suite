# Contributing to Obsidian Latex Suite

Welcome, and thank you for wanting to contribute to [Obsidian Latex Suite](https://github.com/artisticat1/obsidian-latex-suite)

## Asking Questions

Have a question? Instead of opening an issue, please create a [discussion](https://github.com/artisticat1/obsidian-latex-suite/discussions) instead.

## Features

- Have a feature request? Make sure it's related to the typing experience of latex.
- Have a suggestion for the default snippets? Create an issue or pr describing your suggestion.
   Note that default snippets have to work on all platforms that the latest version of obsidian supports.
   Thus for ios specific till they deprecate ios 16.3<=, regex with negative lookbehind can only exists as comments, that have to be manually turned on.
   Is it not a snippet that should be on by default? Post it in the [Snippet sharing thread](https://github.com/artisticat1/obsidian-latex-suite/discussions/50) instead.
- Did you create snippets for another language like python or templater? Open up an issue/pr linking your snippets.

## Contributing to the code of this plugin

- If you are new to developing plugins in obsidian, reading through the [official documentation](https://docs.obsidian.md/Home) of building your first plugin is recommend.
- Need to touch code related to the backend editor codemirror? See [official docs](https://codemirror.net/docs/).

To install and run this plugin:

- clone this repo inside `.obsidian/plugins` of your dev vault
- run `npm install` to install the necessary packages
- run `npm run dev` to compile the project and reload obsidian either with hotreload or with the command.
