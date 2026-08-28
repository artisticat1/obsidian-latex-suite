import type { i18n, Namespace, TFunction } from "i18next";
export const i18next = (window as unknown as { i18next: i18n }).i18next;



export default i18next


// obsidian ships with older version where keyPrefix isn't supported
export function getFixedT<
	Prefix extends string,
	Ns extends Namespace,
>(ns: Ns, prefix: Prefix): TFunction<Ns, Prefix> {
  const translateFn = (key: string) => {
    const fullKey = (key ? `${String(ns)}:${prefix}.${key}` : `${String(ns)}:${prefix}`);
    return (i18next.t as (key: string) => string)(fullKey);
  };

  return translateFn as unknown as TFunction<Ns, Prefix>;
}


export const settings_translation = getFixedT("obsidian-latex-suite", "settings");
