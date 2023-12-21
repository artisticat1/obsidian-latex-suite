# Documentation
## Snippets
Snippets are formatted as follows:

```typescript
{
  trigger: string | RegExp,
  replacement: string | ((str: string) => string) | ((match: RegExpExecArray) => string) | ((selection: string) => (string | false)),
  options: string,
  priority?: number,
  description?: string,
  flags?: string,
}
```

- `trigger` : The text that triggers this snippet.
  - It can also be a regular expression. See [regex snippets](#regex).
- `replacement` : The text to replace the `trigger` with.
- `options` : See below.
- `priority` (optional): This snippet's priority. Snippets with higher priority are run first. Can be negative. Defaults to 0.
- `description` (optional): A description for this snippet.
- `flags` (optional): Flags for [regex snippets](#regex).
  - Not applicable to non-regex snippets.
  - The following flags are permitted: `i`, `m`, `s`, `u`, `v`.

### Options
- `t` : Text mode. Only run this snippet outside math
- `m` : Math mode. Only run this snippet inside math. Shorthand for both `M` and `n`
- `M` : Block math mode. Only run this snippet inside a `$$ ... $$` block
- `n` : Inline math mode. Only run this snippet inside a `$ ... $` block
- `A` : Auto. Expand this snippet as soon as the trigger is typed. If omitted, the <kbd>Tab</kbd> key must be pressed to expand the snippet
- `r` : Regex. The `trigger` will be treated as a regular expression
- `v` : Visual. Only run this snippet when there is a selection. The trigger should be a single character
- `w` : Word boundary. Only run this snippet when the trigger is preceded (and followed by) a word delimiter, such as `.`, `,`, or `-`.
- `c` : Code mode. Only run this snippet inside a ```` ``` ... ``` ```` block
	- Languages using `$` as part of their syntax won't trigger math mode while in their codeblock
	- The `math` language from https://github.com/ocapraro/obsidian-math-plus doesn't trigger code mode, but block math mode instead

Multiple options can be used at once. As an exception, regex and visual are mutually exclusive.

No mode specified means that this snippet can be triggered _at all times_. Multiple modes specified mean that a snippet can be triggered in the given modes, independent of each other.

### Tabstops
- Insert tabstops for the cursor to jump to using `$X`, where X is a number starting from 0.
- Pressing <kbd>Tab</kbd> will move the cursor to the next tabstop.
- Tabstops can have placeholders. Use the format `${X:text}`, where `text` is the text that will be selected by the cursor on moving to this tabstop.
- Tabstops with the same number, X, will all be selected at the same time.

#### Examples
```typescript
{trigger: "//", replacement: "\\frac{$0}{$1}$2", options: "mA"}

{trigger: "dint", replacement: "\\int_{${0:0}}^{${1:\\infty}} $2 d${3:x}", options: "mA"}

{trigger: "outp", replacement: "\\ket{${0:\\psi}} \\bra{${0:\\psi}} $1", options: "mA"}
```


### Regex snippets
To create a regex snippet, you can
- use the `r` option, or
- make the `trigger` a RegExp literal (such as `/regex-goes-here/`).

When creating a regex snippet,
- In the `trigger`, surround an expression with brackets `()` to create a capturing group.
- Inside a `replacement` string, strings of the form `[[X]]` will be replaced by matches in increasing order of X, starting from 0.
- A `replacement` function takes the `RegExpExecArray` match as the parameter.

#### Example
The snippet
```typescript
{trigger: "([A-Za-z])(\\d)", replacement: "[[0]]_{[[1]]}", options: "rA"}
```
will expand `x2` to `x_{2}`.

Using a RegExp literal, the same snippet can be written as
```typescript
{trigger: /([A-Za-z])(\d)/, replacement: "[[0]]_{[[1]]}", options: "A"}
```

> [!IMPORTANT]
> - Some characters, such as `\`, `+`, and `.`, are special characters in regex. If you want to use these literally, remember to escape them by inserting two backslashes (`\\`) before them!
>   - (One backslash to escape the special character, and another to escape that backslash)
> - [Lookbehind regex is not supported on iOS.](https://github.com/bicarlsen/obsidian_image_caption/issues/4#issuecomment-982982629) Using lookbehind regex will cause snippets to break on iOS.

### Visual snippets
To create a visual snippet, you can
- use the `v` option, or
- make the replacement a string containing the special string `${VISUAL}`.

Visual snippets will not expand unless text is selected.

When creating a visual snippet,
- In a `replacement` string, when the snippet is expanded, the special string `${VISUAL}` is replaced with the current selection.
- A `replacement` function takes the selection as the parameter.
    - A visual snippet will not expand if its `replacement` function returns `false` given the selection.

#### Example
![visual snippets](gifs/visual_snippets.gif)

### Snippet variables
The following variables are available for use in a `trigger` or `replacement`:

- `${GREEK}` : Can be inserted in a `trigger`. Shorthand for the following by default:

  ```
  alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|phi|Phi|chi|psi|Psi|omega|Omega
  ```

  Recommended for use with the regex option "r".

- `${SYMBOL}` : Can be inserted in a `trigger`. Shorthand for the following by default:

  ```
  hbar|ell|nabla|infty|dots|leftrightarrow|mapsto|setminus|mid|cap|cup|land|lor|subseteq|subset|implies|impliedby|iff|exists|equiv|square|neq|geq|leq|gg|ll|sim|simeq|approx|propto|cdot|oplus|otimes|times|star|perp|det|exp|ln|log|partial
  ```

  Recommended for use with the regex option "r".

- `${SHORT_SYMBOL}` : Can be inserted in a `trigger`. Shorthand for the following by default:

  ```
  to|pm|mp
  ```

  Recommended for use with the regex option "r".


Snippet variables can be changed in the settings, under **Advanced editor settings > Snippet variables**.


## Snippet files
You can choose to load snippets from a file or from all files within a folder. To do this, toggle the setting **Snippets > Load snippets from file or folder**. The file or folder must be within your vault, and not in a hidden folder (such as `.obsidian/`).

Snippet files can be saved with any extension. However, to obtain syntax highlighting in external editors, you may wish to save your snippet files with an extension of `.js`.

A snippets file is a JavaScript array of snippets, or a JavaScript module with a default export of an array of snippets.

_Note: an **array** is a list of items. In JavaScript, this is represented with the bracket symbols `[` `]`, with the items between them and separated by commas, e.g. `[ item1, item2 ]`._

### Example
A snippet file containing an array of snippets:

```typescript
[
	{trigger: "mk", replacement: "$$0$", options: "tA"},
	{trigger: "dm", replacement: "$$\n$0\n$$", options: "tAw"},
	{trigger: /([A-Za-z])(\d)/, replacement: "[[0]]_{[[1]]}", options: "mA"}
]
```

## Sharing snippets

You can [view snippets written by others and share your own snippets here](https://github.com/artisticat1/obsidian-latex-suite/discussions/50).

> [!WARNING]
> Snippet files are interpreted as JavaScript and can execute arbitrary code.
> Always be careful with snippets shared from others to avoid running malicious code.
