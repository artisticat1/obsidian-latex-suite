import type { i18n } from "i18next";
import resources from "./resources";
import { hasOwn } from "src/utils/editor_utils";
const i18nextOriginal = (window as unknown as { i18next: i18n }).i18next;


export const i18next = i18nextOriginal.createInstance()
export const i18nLanguage = i18nextOriginal.language ?? "en";
const lng = hasOwn(resources, i18nLanguage) ? i18nLanguage : i18nLanguage.split("-")[0]!;
export const isNonEnglish = hasOwn(resources, i18nLanguage) && i18nLanguage !== "en";
void i18next.init({
	lng,
	fallbackLng: "en",
})



export default i18next


export const settings_translation = i18next.getFixedT(null, "settings")
export const settings_translation_en = i18next.getFixedT("en", "settings")
