import Hyphenopoly from 'hyphenopoly';

let hy: ((s:string)=>Promise<string>) | undefined;
export async function initHyphenRu(){
  if (!hy) {
    const loader = Hyphenopoly.config({
      require: ["ru"],
      hyphen: "\u00AD", // soft hyphen
      paths: { patterndir: "/hyphen/" }
    });
    hy = (s:string)=>loader.then(h=>h.hyphenate(s, "ru"));
  }
  return hy;
}
