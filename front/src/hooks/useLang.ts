"use client";

import { useEffect, useState } from "react";

export type Lang = "sq" | "en" | "sr";

export function useLang(defaultLang: Lang = "sq") {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  useEffect(() => {
    const saved = window.localStorage.getItem("euguide-lang") as Lang | null;
    if (saved === "sq" || saved === "en" || saved === "sr") {
      setLangState(saved);
    }
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("euguide-lang", next);
    document.documentElement.lang = next;
  };

  return { lang, setLang };
}
