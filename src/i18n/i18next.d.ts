import resources from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    resources: {
		"obsidian-latex-suite": typeof resources["en"];
	};
	defaultNS: "obsidian-latex-suite";
  }
}
