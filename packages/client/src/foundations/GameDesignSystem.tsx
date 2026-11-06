import {TunableExample} from './playground';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,ChevronRight,Crown,Home,Layers3,Menu,Moon,Search,Sun,X} from 'lucide-react';
import {TooltipLayer} from '../TooltipLayer';
import {componentInfo,componentTitle,gameCopy,groups,type ComponentId} from './game-copy';
import {componentSpecs,dependencies} from './game-catalogue';
import {ComponentExample,ConstructionWorkspace} from './game-examples';
import {GameUIProvider} from './game-ui';
import type {Locale} from './strings';
import './game-system.css';

type Route={page:'home'|'components';id:ComponentId};
function readRoute():Route{
 const [page,id]=location.hash.replace(/^#\//,'').split('/');
 return {page:page==='components'?'components':'home',id:id&&Object.prototype.hasOwnProperty.call(componentInfo,id)?id as ComponentId:'operation'};
}
function href(id:ComponentId){return `#/components/${id}`;}
function levelFor(id:ComponentId){return groups.findIndex(group=>(group.items as readonly string[]).includes(id));}

export function GameDesignSystem(){
 const [route,setRoute]=useState(readRoute);
 const [lang,setLang]=useState<Locale>(()=>new URLSearchParams(location.search).get('lang')==='en'?'en':'ko');
 const [theme,setTheme]=useState(()=>new URLSearchParams(location.search).get('theme')==='dark'?'dark':'light');
 const [query,setQuery]=useState(''),[searchOpen,setSearchOpen]=useState(false),[tab,setTab]=useState('preview'),[mobile,setMobile]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),searchTrigger=useRef<HTMLButtonElement>(null),main=useRef<HTMLElement>(null);
 const t=gameCopy[lang],title=route.page==='home'?t.system:componentTitle(route.id,lang),groupIndex=levelFor(route.id),group=groups[groupIndex],spec=componentSpecs[route.id];
 useEffect(()=>{const update=()=>{setRoute(readRoute());setTab('preview');setMobile(false);};addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update);},[]);
 useEffect(()=>{document.documentElement.dataset.foundationTheme=theme;document.documentElement.lang=lang;document.title=`${title} · Estera Design`;history.replaceState(null,'',`${location.pathname}?${new URLSearchParams({lang,theme})}${location.hash}`);},[lang,theme,title]);
 useEffect(()=>{main.current?.focus({preventScroll:true});window.scrollTo(0,0);document.querySelector('.gd-nav-level a[aria-current="page"]')?.scrollIntoView({block:'nearest'});},[route]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setSearchOpen(value=>!value);}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[]);
 useEffect(()=>{if(searchOpen)dialog.current?.showModal();else if(dialog.current?.open)dialog.current.close();},[searchOpen]);
 const closeSearch=()=>{setSearchOpen(false);setQuery('');searchTrigger.current?.focus();};
 const matches=(Object.keys(componentInfo) as ComponentId[]).filter(id=>componentInfo[id].slice(0,4).some(text=>text.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
 const name=(id:ComponentId)=>componentTitle(id,lang);
 return <GameUIProvider value={lang}><div className="fd-site gu-scope" data-game-theme={theme}>
  <a className="fd-skip" href="#component-main" onClick={event=>{event.preventDefault();main.current?.focus();}}>{t.skip}</a>
  <aside className="fd-rail"><a className="fd-brand" href="#/home" aria-label="Estera Design"><Crown size={27}/><span>E<span>·</span></span></a><nav aria-label={t.navigation}>
   <a href="#/home" className={route.page==='home'?'active':''} aria-current={route.page==='home'?'page':undefined}><span><Home size={22}/></span><small>{t.overview}</small></a>
   <a href={href('button')} className={route.page==='components'&&group.id!=='screens'?'active':''} aria-current={route.page==='components'&&group.id!=='screens'?'page':undefined}><span><Layers3 size={22}/></span><small>{t.components}</small></a>
   <a href={href('construction')} className={route.page==='components'&&group.id==='screens'?'active':''} aria-current={route.page==='components'&&group.id==='screens'?'page':undefined}><span><BookOpen size={22}/></span><small>{t.screens}</small></a>
  </nav><div className="fd-rail-bottom"><button type="button" aria-label={theme==='light'?t.dark:t.light} onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={21}/>:<Sun size={21}/>}</button></div></aside>
  <div className="fd-shell"><header className="fd-header"><a className="fd-wordmark" href="#/home">Estera<span>Design</span></a><div className="fd-header-actions"><button type="button" className="fd-search-trigger" ref={searchTrigger} onClick={()=>setSearchOpen(true)}><Search size={18}/><span>{t.search}</span><kbd>Ctrl K</kbd></button><div className="fd-language" role="group" aria-label={t.language}>{(['ko','en'] as const).map(value=><button type="button" key={value} lang={value} aria-pressed={lang===value} onClick={()=>setLang(value)}>{value==='ko'?'KR':'EN'}</button>)}</div></div></header>
   {route.page==='components'&&<><button type="button" className="fd-mobile-menu" aria-expanded={mobile} onClick={()=>setMobile(!mobile)}><Menu size={18}/>{t.components}</button><aside className={`fd-chapter-nav gd-component-nav ${mobile?'is-open':''}`}><strong>{t.components}</strong><nav aria-label={t.navigation}>{groups.map((section,index)=><div className="gd-nav-level" key={section.id}><div><span>0{index+1}</span><strong>{lang==='ko'?section.ko:section.en}</strong></div>{section.items.map(id=><a key={id} href={href(id)} className={id===route.id?'active':''} aria-current={id===route.id?'page':undefined}>{name(id)}{id===route.id&&<ChevronRight size={14}/>}</a>)}</div>)}</nav></aside></>}
   <main ref={main} tabIndex={-1} id="component-main" className={route.page==='home'?'fd-home gd-home':'fd-content with-chapter-nav gd-component-page'}>
    {route.page==='home'?<>
     <section className="gd-hero"><div><span className="gd-kicker">ESTERA DESIGN SYSTEM</span><h1>{t.hero.split('\n').map((line,index)=><span key={index}>{line}</span>)}</h1><p>{t.intro}</p><div className="gd-hero-actions"><a className="fd-button primary" href={href('operation')}>{t.explore}<ArrowRight size={18}/></a><a className="fd-button" href={href('construction')}>{t.compose}<ArrowUpRight size={18}/></a></div></div><div className="gd-hero-preview"><span>{t.actual}</span><ComponentExample id="operation"/></div></section>
     <section className="gd-hierarchy"><div className="fd-section-heading"><div><h2>{t.hierarchy}</h2><p>{t.hierarchyBody}</p></div></div>{groups.map((section,index)=><section className="gd-level" key={section.id}><header><span>0{index+1}</span><div><h2>{lang==='ko'?section.ko:section.en}</h2><p>{section.description[lang==='ko'?0:1]}</p></div></header><div className="gd-level-items">{section.items.map(id=><a key={id} href={href(id)}><span>{name(id)}</span><code>{componentInfo[id][4]}</code><ArrowUpRight size={18}/></a>)}</div></section>)}</section>
     <section className="gd-home-composition"><div className="fd-section-heading"><div><h2>{t.screenTitle}</h2><p>{t.screenBody}</p></div><a href={href('construction')}>{t.compose}<ArrowRight size={18}/></a></div><ConstructionWorkspace/></section>
    </>:<>
     <div className="fd-breadcrumb"><a href="#/home">{t.overview}</a><ChevronRight size={13}/><span>{lang==='ko'?group.ko:group.en}</span></div>
     <header className="fd-page-heading gd-page-heading"><div className="gd-level-label">0{groupIndex+1}<span>{lang==='ko'?group.ko:group.en}</span></div><h1>{title}</h1><p>{componentInfo[route.id][lang==='ko'?2:3]}</p></header>
     <div className="gd-tabs" role="tablist" aria-label={title}>{['preview','anatomy','usage'].map(value=><button type="button" key={value} id={`tab-${value}`} role="tab" aria-selected={tab===value} aria-controls={`panel-${value}`} tabIndex={tab===value?0:-1} onClick={()=>setTab(value)} onKeyDown={event=>{const items=['preview','anatomy','usage'];if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?2:(items.indexOf(value)+(event.key==='ArrowRight'?1:-1)+3)%3;setTab(items[next]);document.getElementById(`tab-${items[next]}`)?.focus();}}>{t[value as 'preview'|'anatomy'|'usage']}</button>)}</div>
     <section className="gd-tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
      {tab==='preview'?<div className={`gd-preview ${group.id==='screens'?'is-workspace':''}`}><div className="gd-preview-heading"><code>{componentInfo[route.id][4]}</code><span>{t.example}</span></div><div className="gd-preview-body"><TunableExample key={route.id} id={route.id}/></div></div>:tab==='anatomy'?<div className="gd-anatomy"><div className="gd-component-root"><Layers3 size={24}/><strong>{componentInfo[route.id][4]}</strong><span>{title}</span></div><div className="gd-dependency-list">{dependencies[route.id].map(id=><a key={id} href={href(id)}><span>{name(id)}</span><code>{componentInfo[id][4]}</code><ArrowUpRight size={18}/></a>)}</div></div>:<div className="gd-usage"><code className="gd-code">{spec?.snippet??`<ComponentExample id="${route.id}" />`}</code>{!!spec?.props.length&&<table><thead><tr><th>Prop</th><th>Type</th></tr></thead><tbody>{spec.props.map(([name,type])=><tr key={name}><td><code>{name}</code></td><td><code>{type}</code></td></tr>)}</tbody></table>}</div>}
     </section>
     {dependencies[route.id].length>0&&<section className="gd-built-from"><h2>{t.anatomy}</h2><div>{dependencies[route.id].map(id=><a key={id} href={href(id)}>{name(id)}<ArrowUpRight size={15}/></a>)}</div></section>}
    </>}
    <footer className="gd-footer"><strong>ESTERA DESIGN</strong><button type="button" onClick={()=>window.scrollTo(0,0)}>{t.top}</button></footer>
   </main>
  </div>
  <dialog ref={dialog} className="fd-search-dialog" aria-label={t.search} onCancel={closeSearch} onClose={()=>{setSearchOpen(false);searchTrigger.current?.focus();}}><div className="fd-search-box"><Search size={21}/><input autoFocus aria-label={t.search} placeholder={t.searchHint} value={query} onChange={event=>setQuery(event.target.value)}/><button type="button" aria-label={t.close} onClick={closeSearch}><X size={19}/></button></div><div className="fd-search-results">{matches.map(id=><a key={id} href={href(id)} onClick={closeSearch}><span>{name(id)}<ArrowUpRight size={16}/></span><p>{componentInfo[id][lang==='ko'?2:3]}</p></a>)}{!matches.length&&<p>{t.noResults}</p>}</div></dialog>
  <TooltipLayer/>
 </div></GameUIProvider>;
}
