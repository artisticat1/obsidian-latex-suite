import type { i18n } from "i18next";
const i18nextOriginal = (window as unknown as { i18next: i18n }).i18next;

function normalizeLanguage(language?: string): string {
	const normalized = (language ?? "en").replace("_", "-").toLowerCase();
	return normalized === "zh" || normalized.startsWith("zh-") ? "zh" : "en";
}

export const i18next = i18nextOriginal.createInstance()
void i18next.init({
	lng: normalizeLanguage(i18nextOriginal.language),
	fallbackLng: "en",
})



export default i18next


export const settings_translation = i18next.getFixedT(null, "settings")
