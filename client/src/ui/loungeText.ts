import { getLang } from "../i18n";
export const loungeText = (ja: string, en: string, ko: string): string => getLang()==='ja'?ja:getLang()==='ko'?ko:en;
