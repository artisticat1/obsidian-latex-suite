import { EditorState, Facet, StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { editorInfoField, Notice, Platform, TFile } from "obsidian";
import { Snippet, type SnippetType } from "src/snippets/snippets";

// grouping obsidian apis that obsidian forces in the linter, such that they can be easily replaced.
export function createElement(tagName: Parameters<Document["createElement"]>[0]) {
	return createEl(tagName as Parameters<typeof createEl>[0]);
}

abstract class NoticeLike {
	abstract hide(): void;
}


type NoticeCallback = (content: string | DocumentFragment, timeout: number) => void;
function createNoticeManager(): NoticeCallback {
	let lastNotice: NoticeLike | null = null;

	const lastNoticeFunc = (
		content: string | DocumentFragment,
		timeout: number,
	) => {
		lastNotice?.hide();
		lastNotice = new Notice(content, timeout);
	};
	return lastNoticeFunc;
};

export const notice = StateField.define<NoticeCallback>({
	create: () => createNoticeManager(),
	update: (value) => value,
});

export function showSnippetInfo(state: EditorState,snippet: Snippet<SnippetType>, replacement: string, containsTrigger: boolean) {
	const fragment = new DocumentFragment();
	const message_items: (HTMLElement | string)[][] = [
		[`Description: ${snippet.description}`],
		["Parsed trigger: ", fragment.createEl("code", { text: snippet.trigger.toString() })],
		snippet.triggerKey ? ["Trigger key: ", fragment.createEl("code", { text: snippet.triggerKey })] : [],
		["Replacement", fragment.createEl("code", { text: replacement })],
		[`Auto-enlarge brackets: ${containsTrigger}`],
	];
	const div = fragment.createDiv({}, (div) => {
		div.appendText("Latex Suite: ");
		div.createEl("br");
		const ul = div.createEl("ul");
		for (const item of message_items) {
			if (item.length === 0) continue;
			const li = ul.createEl("li");
			for (const message of item) {
				if (typeof message === "string") {
					li.appendText(message);
				} else {
					li.appendChild(message);
				}
			}
		}
	});
	state.field(notice)(fragment, 5000);
	console.debug(div.textContent);
}


export function isMacOS() {
	return Platform.isMacOS
}

// normally this should be `&dark` and `&light` but obsidian doesn't have it setup correctly and only does `.theme-dark` and `.theme-light`.
export const cmDarkClass = ".theme-dark & ";
export const cmLightClass = ".theme-light & ";



export const fileConfig = Facet.define<{getFile: () => TFile | null}, {getFile: () => TFile | null}>({
    combine: (input) => {
        return input.length > 0 ? input[0] : { getFile: () => null };
    }
});

export function getFileConfig(viewOrState: EditorView | EditorState) {
	const state = viewOrState instanceof EditorView ? viewOrState.state : viewOrState;
	return state.facet(fileConfig);
}

export function getFileConfigExtension(getFile: () => TFile | null) {
	return fileConfig.of({ getFile });
}

export function getFilePathFromState(state: EditorState): string | null {
	const fileInfo = state.field(editorInfoField, false);
	if (fileInfo === undefined) {
		return getFileConfig(state).getFile()?.path ?? null;
	}
	return fileInfo.file?.path ?? null;
}

