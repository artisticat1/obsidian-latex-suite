import { Notice } from "obsidian";
import { Snippet, SnippetType } from "src/snippets/snippets";

// grouping obsidian apis that obsidian forces in the linter, such that they can be easily replaced.
export function createElement(tagName: Parameters<Document["createElement"]>[0]) {
	return createEl(tagName as Parameters<typeof createEl>[0]);
}
const createNoticeManager = () => {
	let lastNotice: Notice | null = null;
	
	const lastNoticeFunc = (content: string | DocumentFragment, timeout: number) => {
		lastNotice?.hide();
		lastNotice = new Notice(content, timeout);
	};
	return lastNoticeFunc;
};
const notice = createNoticeManager();
export function showSnippetInfo(snippet: Snippet<SnippetType>, replacement: string, containsTrigger: boolean) {
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
	notice(fragment, 5000);
	console.debug(div.textContent);
}

