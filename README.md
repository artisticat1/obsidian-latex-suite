# Obsidian Latex Suite <img src="https://img.shields.io/github/manifest-json/v/artisticat1/obsidian-latex-suite"> <img src="https://img.shields.io/github/downloads/artisticat1/obsidian-latex-suite/total">

A plugin for Obsidian that aims to make typesetting LaTeX math as fast as handwriting.

Inspired by [Gilles Castel's setup using UltiSnips](https://castel.dev/post/lecture-notes-1/).

![demo](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/demo.gif)

The plugin's main feature is **snippets**, which help you write LaTeX quicker through shortcuts and text expansion! For example, type

- "sqx" instead of "\sqrt{x}"
- "a/b" instead of "\frac{a}{b}"
- "par x	y	" instead of "\frac{\partial x}{\partial y}"

See [Gilles Castel's writeup](https://castel.dev/post/lecture-notes-1/) for more information.


The plugin comes with a [set of default snippets](https://github.com/artisticat1/obsidian-latex-suite/blob/main/src/default_snippets.js), loosely based on [Gilles Castel's](https://castel.dev/post/lecture-notes-1/#other-snippets). You can modify them, remove them, and write your own.


## Usage
To get started, type "dm" to enter display math mode. Try typing the following:

- "xsr" → "x^{2}".

- "x/y <kbd>Tab</kbd>" → "\\frac{x}{y}".

- "sin @t" → "\\sin \\theta".

**Have a look at the [cheatsheet](#cheatsheet)** for a list of commonly used default snippets.


Once these feel familiar, you can check out the [**default snippets**](https://github.com/artisticat1/obsidian-latex-suite/blob/main/src/default_snippets.js) for more commands. e.g.

- "par <kbd>Tab</kbd> f <kbd>Tab</kbd> x <kbd>Tab</kbd>" → "\\frac{\\partial f}{\\partial x}".

- "dint <kbd>Tab</kbd> 2pi <kbd>Tab</kbd> sin @t <kbd>Tab</kbd> @t <kbd>Tab</kbd>" → "\\int_{0}^{2\pi} \\sin \\theta \\, d\\theta".


You can also add your own snippets! [For more info on writing snippets, see **here**](#snippets). You can [view snippets written by others and share your own snippets here](https://github.com/artisticat1/obsidian-latex-suite/discussions/50).

Aside from snippets, the plugin also comes with several other features that aim to make writing LaTeX easier.


## Features

### Auto-fraction
Lets you type "1/x" instead of "\frac{1}{x}".

For example, it makes the following expansions:

- `x/` → `\frac{x}{}`
- `(a + b(c + d))/` → `\frac{a + b(c + d)}{}`

and moves the cursor inside the brackets.

Once done typing the denominator, press <kbd>Tab</kbd> to exit the fraction.

![auto-fraction](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/auto-fraction.gif)


### Matrix shortcuts
While inside a matrix, array, align, or cases environment,

- Pressing <kbd>Tab</kbd> will insert the "&" symbol.
- Pressing <kbd>Enter</kbd> will insert "\\\\" and move to a new line.
- Pressing <kbd>Shift + Enter</kbd> will move to the end of the next line (which you can use to exit the matrix).

![matrix shortcuts](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/matrix_shortcuts.gif)


### Conceal
**This feature must be enabled in the plugin settings.**

Make your equations more readable by hiding LaTeX markup and instead displaying it in a pretty format.

For example, "\dot{x}^{2} + \dot{y}^{2}" will be displayed as "ẋ² + ẏ²", and "\sqrt{ 1-\beta^{2} }" will be displayed as "√{ 1-β² }".

To reveal the LaTeX syntax, move your cursor over it. You can also choose to delay the reveal for a moment, which makes navigation with arrow keys more intuitive.

![conceal demo 2](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/conceal.gif)
![conceal demo 3](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/conceal_delay.gif)
![conceal demo](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/conceal.png)


### Tabout
To make it easier to navigate and exit equations,

- Pressing <kbd>Tab</kbd> while the cursor is at the end of an equation will move the cursor outside the `$` symbols.
- If the cursor is inside a `\left ... \right` pair, pressing <kbd>Tab</kbd> will jump to after the `\right` command and its corresponding delimiter.
- Otherwise, pressing <kbd>Tab</kbd> will advance the cursor to the next closing bracket: `)`, `]`, `}`, `\rangle`, or `\rvert`.


### Preview inline math
When your cursor is inside inline math, a popup window showing the rendered math will be displayed.

<img width=500 src="https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/inline_math_preview_1.png">
<img width=650 src="https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/inline_math_preview_2.png">


### Visual snippets
Sometimes you want to annotate math, or cancel or cross out terms. Selecting some math with the cursor and typing

- "U" will surround it with "\\underbrace".
- "O" will surround it with "\\overbrace".
- "C" will surround it with "\\cancel".
- "K" will surround it with "\\cancelto".
- "B" will surround it with "\\underset".

![visual snippets](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/visual_snippets.gif)


### Auto-enlarge brackets
When a snippet containing "\\sum", "\\int" or "\\frac" is triggered, any enclosing brackets will automatically be enlarged with "\\left" and "\\right".

![auto-enlarge brackets](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/auto-enlarge_brackets.gif)


### Color and highlight matching brackets

To help make your equations more readable,

- Matching brackets will be displayed in the same color.
- When your cursor is adjacent to a bracket, that bracket and its pair will be highlighted.
- When your cursor is inside brackets, the enclosing brackets will be highlighted.

![color and highlight matching brackets demo](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/color_brackets.gif)


### Editor commands

The plugin also adds the following commands to the Command palette:

- **Box current equation** — surround the equation the cursor is currently in with a box, using "\boxed{ ... }".
- **Select current equation** – select the equation the cursor is currently in.


### Snippets

*Snippets* are shortcuts that allow you to insert certain text based on certain triggers. For example, the default snippet

```typescript
{trigger: "@l", replacement: "\\lambda", options: "mA"}
```

will expand "@l" to "\lambda".

Snippets can be edited in the plugin settings. The structure of a snippet is as follows:

```typescript
{
  trigger: string | RegExp,
  replacement: string,
  options: string,
  priority?: number,
  description?: string,
  flags?: string,
}
```

- `trigger` : The text that triggers this snippet.
  - Triggers can also be regular expressions. [See here for more info.](./DOCS.md#regex-snippets)
- `replacement` : The text to replace the `trigger` with.
  - Replacements can also be JavaScript functions. [See here for more info.](./DOCS.md#function-snippets)
- `options` : See below.
- `priority` (optional): This snippet's priority. Snippets with higher priority are run first. Can be negative. Defaults to 0.
- `description` (optional): A description for this snippet.
- `flags` (optional): Flags for regex snippets.


#### Options
- `t` : Text mode. Only run this snippet outside math
- `m` : Math mode. Only run this snippet inside math. Shorthand for both `M` and `n`
- `M` : Block math mode. Only run this snippet inside a `$$ ... $$` block
- `n` : Inline math mode. Only run this snippet inside a `$ ... $` block
- `A` : Auto. Expand this snippet as soon as the trigger is typed. If omitted, the <kbd>Tab</kbd> key must be pressed to expand the snippet
- `r` : [Regex](./DOCS.md#regex-snippets). The `trigger` will be treated as a regular expression
- `v` : [Visual](./DOCS.md#visual-snippets). Only run this snippet on a selection. The trigger should be a single character
- `w` : Word boundary. Only run this snippet when the trigger is preceded (and followed by) a word delimiter, such as `.`, `,`, or `-`.
- `c` : Code mode. Only run this snippet inside a ```` ``` ... ``` ```` block

Insert **tabstops** for the cursor to jump to by writing "$0", "$1", etc. in the `replacement`.

For examples and more details on writing snippets, including **regex** snippets and **function** snippets, [have a look at the **documentation**](DOCS.md).

You can [view snippets written by others and share your own snippets here](https://github.com/artisticat1/obsidian-latex-suite/discussions/50).

> [!WARNING]
> Snippet files are interpreted as JavaScript and can execute arbitrary code.
> Always be careful with snippets shared from others to avoid running malicious code.


## Cheatsheet

| Trigger            | Replacement      |
| ------------------ | ---------------- |
| mk                 | \$ \$            |
| dm                 | \$\$<br><br>\$\$ |
| sr                 | ^{2}             |
| cb                 | ^{3}             |
| rd                 | ^{ }             |
| \_                 | \_{ }            |
| sq                 | \\sqrt{ }        |
| x/y <kbd>Tab</kbd> | \\frac{x}{y}     |
| //                 | \\frac{ }{ }     |
| "                  | \\text{ }        |
| text               | \\text{ }        |
| x1                 | x_{1}            |
| x,.                | \\mathbf{x}      |
| x.,                | \\mathbf{x}      |
| xdot               | \\dot{x}         |
| xhat               | \\hat{x}         |
| xbar               | \\bar{x}         |
| xvec               | \\vec{x}         |
| xtilde             | \\tilde{x}       |
| xund               | \\underline{x}   |
| ee                 | e^{ }            |
| invs               | ^{-1}            |

When running a snippet that **moves the cursor inside brackets {}, press <kbd>Tab</kbd> to exit the brackets**.


### Greek letters

| Trigger | Replacement  | Trigger | Replacement |
| ------- | ------------ | ------- | ----------- |
| @a      | \\alpha      | eta     | \\eta       |
| @b      | \\beta       | mu      | \\mu        |
| @g      | \\gamma      | nu      | \\nu        |
| @G      | \\Gamma      | xi      | \\xi        |
| @d      | \\delta      | Xi      | \\Xi        |
| @D      | \\Delta      | pi      | \\pi        |
| @e      | \\epsilon    | Pi      | \\Pi        |
| :e      | \\varepsilon | rho     | \\rho       |
| @z      | \\zeta       | tau     | \\tau       |
| @t      | \\theta      | phi     | \\phi       |
| @T      | \\Theta      | Phi     | \\Phi       |
| @k      | \\kappa      | chi     | \\chi       |
| @l      | \\lambda     | psi     | \\psi       |
| @L      | \\Lambda     | Psi     | \\Psi       |
| @s      | \\sigma      |         |             |
| @S      | \\Sigma      |         |             |
| @o      | \\omega      |         |             |
| ome     | \\omega      |         |             |

For Greek letters with short names (2-3 characters), just type their name,
e.g. "pi" → "\\pi".


## Acknowledgements
- [@tth05](https://github.com/tth05)'s [Obsidian Completr](https://github.com/tth05/obsidian-completr) for the basis of the tabstop code.
- [Dynamic Highlights](https://github.com/nothingislost/obsidian-dynamic-highlights/blob/master/src/settings/ui.ts) for reference.
- [Quick Latex for Obsidian](https://github.com/joeyuping/quick_latex_obsidian) for inspiration.


## Contributing
Any contributions and PRs are welcome!


## Support
If you like this plugin and want to say thanks, you can buy me a coffee here.

<a href='https://ko-fi.com/J3J6BBZAW' target='_blank'><img height='42' style='border:0px;height:42px;' src='https://cdn.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
