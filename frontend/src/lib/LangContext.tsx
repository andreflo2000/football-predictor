'use client'
import { createContext, useContext, useState, useEffect } from 'react'

export type Lang = 'ro' | 'en'

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'ro',
  setLang: () => {},
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ro')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('oxiano_lang') as Lang
      if (saved === 'ro' || saved === 'en') setLangState(saved)
    } catch {}
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    try { localStorage.setItem('oxiano_lang', l) } catch {}
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
