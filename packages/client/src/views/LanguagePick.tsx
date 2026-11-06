import {Button as UIButton} from '../ui/controls';
import {t as uiCopy} from '../i18n';
import type {Lang} from '../lang';
import {Sprite} from '../sprites';
import './language-pick.css';
export function LanguagePick({onPick}:{onPick:(lang:Lang)=>void}){
 const preferred=navigator.language.toLowerCase().startsWith('ko')?'ko':'en';
 return <main className="boot language-pick"><Sprite name="crest" size={48}/><div className="segmented" role="group" aria-label="언어 / Language">{(['ko','en'] as const).map(lang=><UIButton key={lang} lang={lang} autoFocus={lang===preferred} aria-pressed={lang===preferred} onClick={()=>onPick(lang)}>{{ko:'한국어',en:'English'}[lang]}</UIButton>)}</div></main>;
}
