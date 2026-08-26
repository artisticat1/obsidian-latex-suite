import resources from "./resources";
import type { i18n } from "i18next";
export const i18nextOriginal = (window as unknown as { i18next: i18n }).i18next;

export const ns = [
	"settings",
]

export const i18next = i18nextOriginal.createInstance({
	lng: "en",
	ns,
	resources,
})
// i18next.addResourceBundle("en", "settings", resources.en.settings)

export default i18next
