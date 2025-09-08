export type Hyphenator = (s: string) => Promise<string>

let hy: Hyphenator | undefined
export async function initHyphenRu(): Promise<Hyphenator> {
  if (!hy) {
    try {
      const Hyphenopoly: any = await (new Function("return import('hyphenopoly')")())
      const loader = Hyphenopoly.default.config({
        require: ['ru'],
        hyphen: '\u00AD',
        paths: { patterndir: '/hyphen/' }
      })
      hy = (s: string) => loader.then((h: any) => h.hyphenate(s, 'ru'))
    } catch {
      hy = async (s: string) => s
    }
  }
  return hy
}
