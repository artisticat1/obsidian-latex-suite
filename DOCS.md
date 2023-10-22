# Documentation
## Snippets

A snippets file is a JavaScript array of snippets, or a JavaScript module with a default export of an array of snippets.

_Note: an **array** is a list of items. In JavaScript, this is represented with the bracket symbols `[` `]`, with the items between them and separated by commas, e.g. `[ item1, item2 ]`._

Snippets are formatted as follows:

```typescript
{trigger: string | RegExp, replacement: string, options: string, flags?: string, description?: string, priority?: number}
```

- `trigger` : The text that triggers this snippet. In JavaScript snippet files, it can also be a `RegExp` literal.
- `replacement` : The text to replace the `trigger` with.
- `options` : See below.
- `flags` (optional): Flags for [regex snippets](#regex). Not applicable to non-regex snippets. The following flags are permitted: `i`, `m`, `s`, `u`, `v`.
- `priority` (optional): This snippet's priority. Snippets with higher priority are run first. Can be negative. Defaults to 0.
- `description` (optional): A description for this snippet.

### Options
- `t` : Text mode. Only run this snippet outside math
- `m` : Math mode. Only run this snippet inside math, shorthand for both `M` and `n`
- `M` : Block math mode. Only run this snippet inside a `$$ ... $$` block
- `n` : Inline math mode. Only run this snippet inside a `$ ... $` block
- `A` : Auto. Expand this snippet as soon as the trigger is typed. If omitted, the <kbd>Tab</kbd> key must be pressed to expand the snippet
- `r` : Regex. The `trigger` will be treated as a regular expression
- `w` : Word boundary. Only run this snippet when the trigger is preceded (and followed by) a word delimiter, such as `.`, `,`, or `-`.
- `c` : Code mode. Only run this snippet inside a ```` ``` ... ``` ```` block
	- Languages using `$` as part of their syntax won't trigger math mode while in their codeblock
	- The `math` language from https://github.com/ocapraro/obsidian-math-plus automatically doesn't trigger code mode, but block math mode instead

Multiple options can be used at once.

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


### Regex
- Use the `r` option to create a regex snippet.
- In the `trigger`, surround an expression with brackets `()` to create a capturing group.
- Inside the `replacement` string, strings of the form `[[X]]` will be replaced by matches in increasing order of X, starting from 0.


> ❗ **Warnings**
> - Some characters, such as `\`, `+`, and `.`, are special characters in regex. If you want to use these literally, remember to escape them by inserting two backslashes (`\\`) before them!
>   - (One backslash to escape the special character, and another to escape that backslash)
> - [Lookbehind regex is not supported on iOS.](https://github.com/bicarlsen/obsidian_image_caption/issues/4#issuecomment-982982629) Using lookbehind regex will cause snippets to break on iOS.

#### Example
The snippet
```typescript
{trigger: "([A-Za-z])(\\d)", replacement: "[[0]]_{[[1]]}", options: "rA"}
```
will expand `x2` to `x_{2}`.


### Variables
The following variables are available for use in a `trigger` or `replacement`:

- `${VISUAL}` : Can be inserted in a `replacement`. When the snippet is expanded, "${VISUAL}" is replaced with the current selection.
	- Visual snippets will not expand unless text is selected.

#### Examples
![visual snippets](gifs/visual_snippets.gif)


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
