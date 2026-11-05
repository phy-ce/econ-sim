import {useLayoutEffect,useState} from 'react';
import {ArrowUpRight,BookOpen,Boxes,Check,Crown,Layers3,Moon,Palette,Sun} from 'lucide-react';
import {TooltipLayer} from '../TooltipLayer';
import {DSBadge,DSButton,DSCopyProvider,DSIconButton,useDS,type DSLocale} from './components';
import {ComponentCatalogue,Composition,Foundations} from './catalogue';
import './tokens.css';
import './design-system.css';

type Page='foundations'|'components'|'composition';
function Studio({lang,onLang}:{lang:DSLocale;onLang:(lang:DSLocale)=>void}){
 const {D}=useDS(),params=new URLSearchParams(location.search);
 const [page,setPage]=useState<Page>(()=>{const p=params.get('tab');return p==='foundations'||p==='composition'?p:'components';});
 const [theme,setTheme]=useState<'light'|'dark'>(params.get('theme')==='dark'?'dark':'light');
 useLayoutEffect(()=>{document.body.dataset.uiTheme=theme;document.documentElement.lang=lang;document.title=`Estera · ${D.title} 01`;const query=new URLSearchParams({tab:page,theme,lang});history.replaceState(null,'',`${location.pathname}?${query}`);},[theme,lang,page,D.title]);
 const nav=[{id:'foundations' as const,Icon:Palette},{id:'components' as const,Icon:Boxes},{id:'composition' as const,Icon:Layers3}];
 return <div className="ds-studio"><aside className="ds-sidebar"><a className="ds-brand" href="./design-system.html"><span><Crown size={23}/></span><b>ESTERA<small>{D.edition}</small></b></a><div className="ds-nav-caption">{D.title}<span>01</span></div><nav aria-label={D.title}>{nav.map(({id,Icon},i)=><button type="button" key={id} aria-current={page===id?'page':undefined} onClick={()=>setPage(id)}><Icon size={18}/><span>{D[id]}</span><small>0{i+1}</small></button>)}</nav><div className="ds-sidebar-footer"><span className="ds-proposal-dot"/>{D.draft}<span className="ds-edition-number">01</span></div></aside>
  <main className="ds-main"><header className="ds-topbar"><div><BookOpen size={16}/><span>ESTERA</span><i>/</i><strong>{D.title}</strong></div><div className="ds-topbar-actions"><div className="ds-language" role="group" aria-label={D.language}><button type="button" lang="ko" aria-pressed={lang==='ko'} onClick={()=>onLang('ko')}>KR</button><button type="button" lang="en" aria-pressed={lang==='en'} onClick={()=>onLang('en')}>EN</button></div><DSIconButton label={theme==='light'?D.dark:D.light} onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='light'?<Moon size={17}/>:<Sun size={17}/>}</DSIconButton><a className="ds-game-link" href="./">{D.openGame}<ArrowUpRight size={15}/></a></div></header>
   <div className="ds-page"><div className="ds-page-heading"><div><span className="ds-eyebrow">ESTERA / 0{nav.findIndex(n=>n.id===page)+1}</span><h1>{D[page]}</h1></div><div className="ds-heading-meta"><DSBadge tone="brass">{D.draft} 01</DSBadge><span>1920 × 1028</span><span>{D.sample}</span></div></div>
    {page==='components'&&<><div className="ds-section-ruler"><span>{D.edition}</span><i/><span>01 — 06</span></div><ComponentCatalogue/><div className="ds-catalogue-footer"><span><Check size={15}/>KR / EN</span><span>{D.light} / {D.dark}</span><span className="ds-footer-spacer"/><DSButton size="small" variant="quiet" onClick={()=>setPage('composition')}>{D.composition}<ArrowUpRight size={15}/></DSButton></div></>}
    {page==='foundations'&&<Foundations key={theme}/>}
    {page==='composition'&&<Composition/>}
   </div>
  </main><TooltipLayer/>
 </div>;
}
export function DesignSystem(){const [lang,setLang]=useState<DSLocale>(new URLSearchParams(location.search).get('lang')==='en'?'en':'ko');return <DSCopyProvider value={lang}><Studio lang={lang} onLang={setLang}/></DSCopyProvider>;}
