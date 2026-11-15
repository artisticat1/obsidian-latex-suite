import en_settings from "./locales/en/settings.json";
import zh_settings from "./locales/zh/settings.json";

const resources = {
	en: {
		settings: en_settings,
	},
	zh: {
		settings: zh_settings,
	},
} as const;

export default resources;
