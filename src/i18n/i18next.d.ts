import resources from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    resources: typeof resources["en"];
	defaultNS: "settings"
  }
}
