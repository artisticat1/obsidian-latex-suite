import { snippet } from "@codemirror/autocomplete";
import { Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { Bounds, getContextPlugin, getMathBoundsPlugin } from "./context";
import { editorLivePreviewField, MarkdownView } from "obsidian";
/*
check math environments in markdown of hypermd syntaxtree.
prototype for e2e tests and util tests.
*/


const clearDoc = (view: EditorView) => {
	view.dispatch({
		changes: {
			from: 0,
			to: view.state.doc.length,
			insert: "",
		},
	});
}

const BoundsEqual = (b1: Bounds | null, b2: Bounds): boolean => {
	if (b1 === null) return false;
	return b1.inner_start === b2.inner_start &&
		b1.inner_end === b2.inner_end &&
		b1.outer_start === b2.outer_start &&
		b1.outer_end === b2.outer_end;
}	

const snippetFromView = (view: EditorView, content: string) => {
	const state = view.state;
	snippet(content)({
		state,dispatch: view.dispatch,
	}, {label: ""}, 0,0)
}

const normalInline = (view: EditorView) => {
	const content = `$a+\${}b=c$`
	snippetFromView(view, content);
	const ctx = getContextPlugin(view);
	console.assert(ctx.mode.inlineMath, "inline math mode should be detected");	
	return ctx.mode.inlineMath;
}

const normalDisplay = (view: EditorView) => {
	const content = `$$a+\${}b=c$$`
	snippetFromView(view, content);
	const ctx = getContextPlugin(view);
	console.assert(ctx.mode.blockMath, "display math mode should be detected");	
	return ctx.mode.blockMath;
}

const weirdInlineDisplay = (view: EditorView) => {
	const content = `text $\${}$
a+b=c
$$ text`
	snippetFromView(view, content);
	const selection = view.state.selection.main;
	const ctx = getContextPlugin(view);
	console.assert(ctx.mode.inlineMath, "inline math mode should be detected",ctx.mode);	
	return ctx.mode.inlineMath;
}

const listInline = (view: EditorView) => {
	const content = `1. $\${}a+b=c$`
	snippetFromView(view, content);
	const ctx = getContextPlugin(view);
	console.assert(ctx.mode.inlineMath, "inline math mode should be detected");	
	return ctx.mode.inlineMath;
}

const listInlineSurrounded = (view: EditorView) => {
	const content = `1. some text $\${}a+b=c$ and more text`
	snippetFromView(view, content);
	const ctx = getContextPlugin(view);
	console.assert(ctx.mode.inlineMath, "inline math mode should be detected");	
	return ctx.mode.inlineMath;
}


const listInlineDisplay = (view: EditorView) => {
	const content = `1. $\${}$a+b=c$$
	
$$
E=mc^2
$$`
	snippetFromView(view, content);
	const ctx = getContextPlugin(view);
	const bounds = ctx.getBounds();
	const correctBounds: Bounds = {
		inner_start: 3,
		inner_end: 3,
		outer_start: 2,
		outer_end: 4,
	}
	const cond = ctx.mode.inlineMath && BoundsEqual(bounds, correctBounds);
	console.assert(cond, "inline math mode should be detected");	
	return cond;
}

const calloutInlineSurround = (view: EditorView) => {
	const content = `> callout
> some text $\${}a+b=c$ and more text
> and more text`
	snippetFromView(view, content);
	const ctx = getContextPlugin(view);
	console.assert(ctx.mode.inlineMath, "inline math mode should be detected");	
	return ctx.mode.inlineMath;
}

const calloutText = (view: EditorView) => {
	const content = `
>[!example]
> $$E=mc^2 $$
\${}
`
	snippetFromView(view, content);
	const ctx = getContextPlugin(view);
	const cond = ctx.mode.text && !ctx.mode.inMath();
	const state = view.state;
	const plugin = getMathBoundsPlugin(view);
	plugin.getEquationBounds(state, ctx.pos);
	console.assert(cond, "should not be in math mode", ctx.mode);	
	return cond;
}

const calloutDisplay = (view: EditorView) => {
	const content = `
>[!example]
> some text
> $$
> E=mc^2\${}
> $$
> some text
`
	snippetFromView(view, content);
	const ctx = getContextPlugin(view);
	const cond = ctx.mode.blockMath;
	const state = view.state;
	const plugin = getMathBoundsPlugin(view);
	plugin.getEquationBounds(state, ctx.pos);
	console.assert(cond, "should not be in math mode", ctx.mode);	
	return cond;
}

const multipleViewports = (view: EditorView) => {
	// issue #489, test if multiple viewports cause issues with math bounds detection.
	const content = `
$$
\\text{1st Math section (inline or block)}
$$
%% Everything above the callout is normal %%
(normal)

> [!info]
> $$
> \\text{math section in a callout (both inline and block cause this issue)}
> $$

%% The content between the callout and the 2nd math section is affected %% 
%% i.e. parenthesis are colored, \`t\` snippets don't expand, \`m\` snippets do %%
(bugged)
\${}

$$
\\text{2nd Math section (inline or block)}
$$
`
	console.log(view)
	const isLivePreview = view.state.field(editorLivePreviewField);
	const mdView = app.workspace.getActiveViewOfType(MarkdownView);
	if (mdView && !isLivePreview) {
		//@ts-ignore
		app.commands.executeCommandById("editor:toggle-source");
	}
	snippetFromView(view, content);
	const ctx = getContextPlugin(view);
	console.assert(ctx.mode.text, "should be in block math mode", ctx.mode);	
	if (mdView && !isLivePreview) {
		//@ts-ignore
		app.commands.executeCommandById("editor:toggle-source");
	}
	return ctx.mode.text;
}

	
type CheckFn = (view: EditorView) => boolean;

const environmentChecks: CheckFn[] = [
	normalInline,
	normalDisplay,
	weirdInlineDisplay,
	listInline,
	listInlineSurrounded,
	listInlineDisplay,
	calloutInlineSurround,
	calloutText,
	calloutDisplay,
	multipleViewports,
].map(fn => (view: EditorView) => {
	clearDoc(view);
	return fn(view);
});

const checkEnvironments =  keymap.of([
	{
		key: "Ctrl-j",
		run: (view) => {
			const state=view.state;
			const doc = state.doc
			if (doc.toString().trim().length !== 0) {
				return false;
			}
			for (const fn of environmentChecks) {
				if (!fn(view)) {
					return true;
				}
			}
			clearDoc(view);
			
			return true;
		}
	}
])
export const debugEnvironments = Prec.highest(checkEnvironments)
