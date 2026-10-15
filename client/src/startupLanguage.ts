type Language = 'ja' | 'ko' | 'en';
/** Saved choices need no network. New visitors keep IP defaults when available. */
export async function startupLanguage(): Promise<Language> {
  try {
    const saved = localStorage.getItem('lore_lang');
    if (saved === 'ja' || saved === 'ko' || saved === 'en') return saved;
  } catch { /* Restricted storage does not prevent opening the site. */ }
  const browser = (navigator.language || 'en').slice(0, 2);
  const fallback: Language = browser === 'ja' || browser === 'ko' ? browser : 'en';
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<Language>(resolve => {
    timer = setTimeout(() => { controller.abort(); resolve(fallback); }, 800);
  });
  try {
    return await Promise.race([deadline, fetch('/api/geo', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) return fallback;
        const data = await response.json() as { country?: string };
        return data?.country === 'JP' ? 'ja' : data?.country === 'KR' ? 'ko' : 'en';
      }).catch(() => fallback)]);
  } finally { clearTimeout(timer!); }
}
