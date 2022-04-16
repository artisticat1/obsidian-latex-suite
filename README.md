# Obsidian Latex Suite
A plugin for Obsidian that aims to make typesetting LaTeX as fast as handwriting.

Inspired by [Gilles Castel's setup](https://castel.dev/post/lecture-notes-1/) using UltiSnips.

![demo](gifs/demo.gif)

The plugin's main feature is **snippets**, which help you write LaTeX quicker through text expansion. For example, type

- "xdot" instead of "\dot{x}"
- "a/b" instead of "\frac{a}{b}"
- "par x	y	" instead of "\frac{\partial x}{\partial y}"

See [here](https://castel.dev/post/lecture-notes-1/) for more information.


## Features
- Snippets
	- Tabstops
	- Regex
	- Options
- Multiple cursor support
- Auto-fraction
- Matrix shortcuts
- Auto-enlarge brackets
- Tabout
- Editor commands

You can switch features on/off in settings.


The plugin comes with a [set of default snippets](https://github.com/artisticat1/obsidian-latex-suite/blob/main/src/default_snippets.ts), loosely based on [Gilles Castel's](https://castel.dev/post/lecture-notes-1/#other-snippets). You can modify them, remove them, and write your own!


## Usage
To get started, type "dm" to enter display math mode. Try typing the following:

- "xsr" → "x^{2}".

- "x/y <kbd>Tab</kbd>" → "\\frac{x}{y}".

- "sin @t" → "\\sin \\theta".

**Have a look at the [cheatsheet](#cheatsheet)** for a list of commonly used default snippets.


Once these feel familiar, you can check out the [default snippets](https://github.com/artisticat1/obsidian-latex-suite/blob/main/src/default_snippets.ts) for a fuller set of commands. e.g.

- "par f <kbd>Tab</kbd> x <kbd>Tab</kbd>" → "\\frac{\\partial f}{\\partial x}".

- "dint <kbd>Tab</kbd> 2pi <kbd>Tab</kbd> sin @t <kbd>Tab</kbd> @t <kbd>Tab</kbd>" → "\\int_{0}^{2\pi} \\sin \\theta \\, d\\theta".


You can also add your own snippets!

### Snippets
Snippets are formatted as follows:

```typescript
{trigger: string, replacement: string, options: string, description?: string, priority?: number}
```

- `trigger` : The text that triggers this snippet.
- `replacement` : The text to replace the `trigger` with.
- `options` : See below.
- `priority` (optional): This snippet's priority. Snippets with higher priority are run first. Can be negative. Defaults to 0.
- `description` (optional): A description for this snippet.


#### Options
- `m` : Math mode. Only run this snippet inside math
- `t` : Text mode. Only run this snippet outside math
- `A` : Auto. Expand this snippet as soon as the trigger is typed. If omitted, the <kbd>Tab</kbd> key must be pressed to expand the snippet
- `r` : Regex. The `trigger` will be treated as a regular expression

Insert **tabstops** for the cursor to jump to by writing "$0", "$1", etc. in the `replacement`.

For more details on writing snippets, including **regex** snippets, [see the documentation here](DOCS.md).


### Auto-fraction
Lets you type "1/x" instead of "\frac{1}{x}".

For example, it makes the following expansions:

- `x/` → `\frac{x}{}`
- `(a + b(c + d))/` → `\frac{a + b(c + d)}{}`

and moves the cursor inside the brackets.

Once done typing the denominator, press <kbd>Tab</kbd> to exit the fraction.

![auto-fraction](gifs/auto-fraction.gif)


### Auto-enlarge brackets
When a snippet containing "\\sum", "\\int" or "\\frac" is triggered, any enclosing brackets will be enlarged with "\\left" and "\\right".

![auto-enlarge brackets](gifs/auto-enlarge_brackets.gif)


### Matrix shortcuts
While inside a matrix, array, align, or cases environment,

- Pressing <kbd>Tab</kbd> will insert the "&" symbol
- Pressing <kbd>Enter</kbd> will insert "\\\\" and move to a new line
- Pressing <kbd>Shift + Enter</kbd> will move to the end of the next line (can be used to exit the matrix)

![matrix shortcuts](gifs/matrix_shortcuts.gif)


### Visual snippets
Sometimes you want to annotate math, or cancel or cross out terms. Selecting some math with the cursor and typing

- "U" will surround it with "\\underbrace".
- "C" will surround it with "\\cancel".
- "K" will surround it with "\\cancelto".
- "B" will surround it with "\\underset".

![visual snippets](gifs/visual_snippets.gif)


### Tabout
- Pressing <kbd>Tab</kbd> while the cursor is at the end of an equation will move the cursor outside the $ symbols.
- Otherwise, pressing <kbd>Tab</kbd> will advance the cursor to the next closing bracket: ), ], }, >, or |.


### Editor commands
- Box current equation – surround the equation the cursor is currently in with a box.
- Select current equation – select the equation the cursor is currently in.



## Cheatsheet

| Trigger           | Replacement      |
| ----------------- | ---------------- |
| mk                | \$ \$            |
| dm                | \$\$<br><br>\$\$ |
| sr                | ^{2}             |
| cb                | ^{3}             |
| rd                | ^{ }             |
| \_                | \_{ }            |
| sq                | \\sqrt{ }        |
| x/y               | \\frac{x}{y}     |
| //                | \\frac{ }{ }     |
| te <kbd>Tab</kbd> | \\text{ }        |
| x1                | x_{1}            |
| xdot              | \\dot{x}         |
| xhat              | \\hat{x}         |
| xbar              | \\overline{x}         |

When running a snippet that **moves the cursor inside brackets {}, press <kbd>Tab</kbd> to exit the brackets**.


### Greek letters

| Trigger | Replacement  | Trigger | Replacement |
|---------|--------------|---------|-------------|
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

For greek letters with short names (2-3 characters), just type their name!
e.g. "pi" → "\\pi"



## Acknowledgements
- [@tth05](https://github.com/tth05)'s [Obsidian Completr](https://github.com/tth05/obsidian-completr) for the basis of the tabstop code
- [Dynamic Highlights](https://github.com/nothingislost/obsidian-dynamic-highlights/blob/master/src/settings/ui.ts) for reference
- [Quick Latex for Obsidian](https://github.com/joeyuping/quick_latex_obsidian) for inspiration