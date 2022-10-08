# Obsidian Latex Suite
**🌟 New in 1.5.0: Pop-up preview window for inline math.**

A plugin for Obsidian that aims to make typesetting LaTeX math as fast as handwriting.

Inspired by [Gilles Castel's setup using UltiSnips](https://castel.dev/post/lecture-notes-1/).

![demo](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/demo.gif)

The plugin's main feature is **snippets**, which help you write LaTeX quicker through shortcuts and text expansion! For example, type

- "sqx" instead of "\sqrt{x}"
- "a/b" instead of "\frac{a}{b}"
- "par x	y	" instead of "\frac{\partial x}{\partial y}"

See [Gilles Castel's writeup](https://castel.dev/post/lecture-notes-1/) for more information.


The plugin comes with a [set of default snippets](https://github.com/artisticat1/obsidian-latex-suite/blob/main/src/default_snippets.ts), loosely based on [Gilles Castel's](https://castel.dev/post/lecture-notes-1/#other-snippets). You can modify them, remove them, and write your own.


## Usage
To get started, type "dm" to enter display math mode. Try typing the following:

- "xsr" → "x^{2}".

- "x/y <kbd>Tab</kbd>" → "\\frac{x}{y}".

- "sin @t" → "\\sin \\theta".

**Have a look at the [cheatsheet](#cheatsheet)** for a list of commonly used default snippets.


Once these feel familiar, you can check out the [default snippets](https://github.com/artisticat1/obsidian-latex-suite/blob/main/src/default_snippets.ts) for more commands. e.g.

- "par <kbd>Tab</kbd> f <kbd>Tab</kbd> x <kbd>Tab</kbd>" → "\\frac{\\partial f}{\\partial x}".

- "dint <kbd>Tab</kbd> 2pi <kbd>Tab</kbd> sin @t <kbd>Tab</kbd> @t <kbd>Tab</kbd>" → "\\int_{0}^{2\pi} \\sin \\theta \\, d\\theta".


You can also add your own snippets! [See here for more info on writing snippets](#snippets). You can [view snippets written by others and share your own snippets here](https://github.com/artisticat1/obsidian-latex-suite/discussions/50).


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

- Pressing <kbd>Tab</kbd> will insert the "&" symbol
- Pressing <kbd>Enter</kbd> will insert "\\\\" and move to a new line
- Pressing <kbd>Shift + Enter</kbd> will move to the end of the next line (can be used to exit the matrix)

![matrix shortcuts](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/matrix_shortcuts.gif)


### Conceal
*This feature must be enabled in settings!*

Make your equations more readable by hiding LaTeX code, instead rendering it in a pretty format.

For example, "\dot{x}^{2} + \dot{y}^{2}" will be displayed as "ẋ² + ẏ²".

To reveal the LaTeX code, move the cursor over it.

#### Examples
![conceal demo](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/conceal.png)
![conceal demo 2](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/conceal.gif)


### Tabout
- Pressing <kbd>Tab</kbd> while the cursor is at the end of an equation will move the cursor outside the $ symbols.
- Otherwise, pressing <kbd>Tab</kbd> will advance the cursor to the next closing bracket: ), ], }, >, or |.


### Color & highlight matching brackets
- Matching brackets are rendered in the same color, to help with readability.
- When the cursor is adjacent to a bracket, that bracket and its pair will be highlighted.
- When the cursor is inside brackets, the enclosing brackets will be highlighted.

![color and highlight matching brackets demo](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/color_brackets.gif)


### Preview inline math
When the cursor is inside inline math, a popup window showing the rendered math will be displayed.

<img width=500 src="https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/inline_math_preview_1.png">
<img width=650 src="https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/inline_math_preview_2.png">


### Visual snippets
Sometimes you want to annotate math, or cancel or cross out terms. Selecting some math with the cursor and typing

- "U" will surround it with "\\underbrace".
- "C" will surround it with "\\cancel".
- "K" will surround it with "\\cancelto".
- "B" will surround it with "\\underset".

![visual snippets](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/visual_snippets.gif)


### Auto-enlarge brackets
When a snippet containing "\\sum", "\\int" or "\\frac" is triggered, any enclosing brackets will be enlarged with "\\left" and "\\right".

![auto-enlarge brackets](https://raw.githubusercontent.com/artisticat1/obsidian-latex-suite/main/gifs/auto-enlarge_brackets.gif)


### Editor commands
- Box current equation – surround the equation the cursor is currently in with a box.
- Select current equation – select the equation the cursor is currently in.


### Snippets
Snippets are formatted as follows:

```typescript
{trigger: string, replacement: string, options: string, description?: string, priority?: number}
```

- `trigger` : The text that triggers this snippet.
- `replacement` : The text to replace the `trigger` with.
- `options` : See below.
- `description` (optional): A description for this snippet.
- `priority` (optional): This snippet's priority. Defaults to 0. Snippets with higher priority are run first. Can be negative.


#### Options
- `m` : Math mode. Only run this snippet inside math
- `t` : Text mode. Only run this snippet outside math
- `A` : Auto. Expand this snippet as soon as the trigger is typed. If omitted, the <kbd>Tab</kbd> key must be pressed to expand the snippet
- `r` : Regex. The `trigger` will be treated as a regular expression
- `w` : Word boundary. Only run this snippet when the trigger is preceded (and followed by) a word delimiter, such as `.`, `,`, or `-`.

Insert **tabstops** for the cursor to jump to by writing "$0", "$1", etc. in the `replacement`.

For more details on writing snippets, including **regex** snippets, [see the documentation here](DOCS.md). You can [view snippets written by others and share your own snippets here](https://github.com/artisticat1/obsidian-latex-suite/discussions/50).




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
| x,.               | \\mathbf{x}      |
| x.,               | \\mathbf{x}      |
| xdot              | \\dot{x}         |
| xhat              | \\hat{x}         |
| xbar              | \\overline{x}    |
| ee                | e^{ }            |

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



## Support
If you like this plugin and want to say thanks, you can buy me a coffee here.

<a href='https://ko-fi.com/J3J6BBZAW' target='_blank'><img height='56' style='border:0px;height:56px;' src='https://cdn.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
