import type { i18n } from "i18next";
const i18nextOriginal = (window as unknown as { i18next: i18n }).i18next;

export const i18next = i18nextOriginal.createInstance()
void i18next.init({
	lng: i18nextOriginal.language,
	fallbackLng: "en",
})



export default i18next


export const settings_translation = i18next.getFixedT(null, "settings")
