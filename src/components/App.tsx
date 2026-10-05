import {useEffect, useRef, useState, type ReactNode} from 'react';
import {ArrowUpRight, Backpack, Bookmark, Check, CheckCircle2, ChevronRight, Clock3, Download, Heart, Info, Leaf, Menu, Minus, Plus, Printer, Search, Scissors, Shirt, ShoppingBag, SlidersHorizontal, Sofa, Sparkles, Sprout, Wrench, X} from 'lucide-react';
import type {Guide, Library, Repair} from '../lib/types';
import {impact, matchGuides, missingTools, validateRepairs} from '../lib/planner';
import {client, libraryQuery, projectId, dataset} from '../lib/sanity';

type View = 'discover' | 'planner' | 'saved' | 'impact' | 'about';
const categories = ['All repairs', 'Clothing', 'Bags', 'Home textiles'];
const icons: Record<string, typeof Shirt> = {shirt:Shirt, scissors:Scissors, backpack:Backpack, sofa:Sofa, 'shopping-bag':ShoppingBag};
const storageKey = 'mend.repairs.v1';

function Modal({children, onClose, title}: {children:ReactNode; onClose:()=>void; title:string}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return ()=>{dialog?.close(); previous?.focus();};
  },[]);
  return <dialog ref={ref} className="dialog" aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target === e.currentTarget) onClose();}}>
    <button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}><X size={21}/></button>{children}
  </dialog>;
}

export default function App({initialLibrary, base}: {initialLibrary:Library; base:string}) {
  const [library,setLibrary] = useState(initialLibrary);
  const [view,setView] = useState<View>('discover');
  const [category,setCategory] = useState('All repairs');
  const [search,setSearch] = useState('');
  const [quick,setQuick] = useState(false);
  const [repairs,setRepairs] = useState<Repair[]>([]);
  const [owned,setOwned] = useState<string[]>([]);
  const [ready,setReady] = useState(false);
  const [storageError,setStorageError] = useState<'corrupt'|'unavailable'|null>(null);
  const [activeGuide,setActiveGuide] = useState<Guide | null>(null);
  const [activeRepairId,setActiveRepairId] = useState<string | null>(null);
  const [planCategory,setPlanCategory] = useState('Clothing');
  const [minutes,setMinutes] = useState(30);
  const [savedFilter,setSavedFilter] = useState('In progress');
  const [mobileMenu,setMobileMenu] = useState(false);
  const [toast,setToast] = useState('');
  const [refreshing,setRefreshing] = useState(false);
  const [resetDialog,setResetDialog] = useState(false);
  const [weight,setWeight] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stats = impact(repairs);
  const inProgress = repairs.filter(r=>!r.completedAt);
  const activeRepair = repairs.find(r=>r.id === activeRepairId);

  useEffect(()=>{
    try {
      setRepairs(validateRepairs(JSON.parse(localStorage.getItem(storageKey) || '[]')));
      const tools = JSON.parse(localStorage.getItem('mend.tools.v1') || '[]');
      if(Array.isArray(tools)) setOwned(tools.filter((t:unknown)=>typeof t === 'string'));
    } catch(error) {setStorageError(error instanceof SyntaxError?'corrupt':'unavailable');}
    setReady(true);
  },[]);
  useEffect(()=>{
    if(!ready) return;
    try {localStorage.setItem(storageKey,JSON.stringify(repairs));localStorage.setItem('mend.tools.v1',JSON.stringify(owned));}
    catch {setStorageError('unavailable');}
  },[repairs,owned,ready]);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{
    const context = (document as Document & {modelContext?:{registerTool:(tool:unknown,options:unknown)=>Promise<void>}}).modelContext;
    if(!context?.registerTool) return;
    const controller = new AbortController();
    void Promise.resolve(context.registerTool({
      name:'find_repairs', description:'Find sourced repairs that fit a category, available minutes, and owned tools. Does not save or start a repair.',
      inputSchema:{type:'object',properties:{category:{type:'string',enum:categories.slice(1)},minutes:{type:'integer',minimum:1,maximum:180},ownedToolIds:{type:'array',items:{type:'string'}}},required:['category','minutes','ownedToolIds'],additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:true},
      execute(input:unknown){
        const x = input as {category?:string; minutes?:number; ownedToolIds?:string[]};
        if(!x || !categories.slice(1).includes(x.category || '') || !Number.isInteger(x.minutes) || x.minutes! < 1 || x.minutes! > 180 || !Array.isArray(x.ownedToolIds) || !x.ownedToolIds.every(t=>typeof t === 'string')) throw new Error('Provide a valid category, minutes from 1 to 180, and an array of tool IDs.');
        return matchGuides(library.guides,x.category!,x.minutes!,x.ownedToolIds).map(g=>({id:g._id,title:g.title,minutes:g.duration,missingTools:missingTools(g,x.ownedToolIds!),source:g.source.url}));
      },
    },{signal:controller.signal})).catch(()=>{});
    return ()=>controller.abort();
  },[library]);

  function notify(text:string){setToast(text);clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),3500);}
  function navigate(next:View){setView(next);setMobileMenu(false);setSearch('');window.scrollTo({top:0,behavior:'smooth'});}
  function saveGuide(guide:Guide,open=false){
    const existing=repairs.find(r=>r.guideId===guide._id && !r.completedAt);
    let record=existing;
    if(!record){record={id:crypto.randomUUID(),guideId:guide._id,title:guide.title,createdAt:new Date().toISOString(),checkedSteps:[],weightGrams:0};setRepairs(old=>[record!,...old]);notify('Repair plan saved to your shelf');}
    if(open){setActiveGuide(guide);setActiveRepairId(record.id);setWeight('');}
  }
  function openGuide(guide:Guide,repair?:Repair){setActiveGuide(guide);setActiveRepairId(repair?.id || repairs.find(r=>r.guideId===guide._id && !r.completedAt)?.id || null);setWeight('');}
  function toggleStep(key:string){if(!activeRepair) return;setRepairs(old=>old.map(r=>r.id===activeRepair.id ? {...r,checkedSteps:r.checkedSteps.includes(key)?r.checkedSteps.filter(s=>s!==key):[...r.checkedSteps,key]} : r));}
  function completeRepair(){
    if(!activeGuide || !activeRepair || !activeGuide.steps.every(s=>activeRepair.checkedSteps.includes(s._key))) return;
    const grams=weight.trim()===''?0:Number(weight);
    if(!Number.isFinite(grams)||grams<0||grams>100000){notify('Enter a weight between 0 and 100,000 grams, or leave it blank.');return;}
    setRepairs(old=>old.map(r=>r.id===activeRepair.id?{...r,completedAt:new Date().toISOString(),weightGrams:grams}:r));notify('One more good thing kept in use. Nicely done.');
  }
  async function refreshLibrary(){
    setRefreshing(true);
    try{const result=await client.withConfig({useCdn:false}).fetch<{guides:Guide[];tools:Library['tools']}>(libraryQuery,{}, {timeout:10000});
      if(!result.guides.length) throw new Error('empty');
      setLibrary({...result,mode:'sanity',fetchedAt:new Date().toISOString()});notify('Repair library refreshed from Sanity');
    }catch{notify('Live library is unavailable. Your saved plans are still here.');}
    finally{setRefreshing(false);}
  }
  function exportRepairs(){
    const url=URL.createObjectURL(new Blob([JSON.stringify({app:'Mend',exportedAt:new Date().toISOString(),repairs},null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='mend-my-repairs.json';link.click();URL.revokeObjectURL(url);notify('Your repair journal has been exported');
  }

  const filtered = library.guides.filter(g=>(category==='All repairs'||g.category===category) && (!quick||g.duration<=20) && `${g.title} ${g.summary} ${g.symptom} ${g.category}`.toLowerCase().includes(search.toLowerCase()));
  const matches=matchGuides(library.guides,planCategory,minutes,owned);
  const nav=[{id:'discover',name:'Discover repairs',icon:Sprout},{id:'planner',name:'Repair planner',icon:SlidersHorizontal},{id:'saved',name:'My repair shelf',icon:Bookmark},{id:'impact',name:'My impact',icon:Leaf}] as const;

  function GuideCard({guide}: {guide:Guide}){
    const Icon=icons[guide.icon] || Shirt;
    const saved=repairs.some(r=>r.guideId===guide._id&&!r.completedAt);
    return <article className="guide-card">
      <div className={`guide-art ${guide.color}`}><Icon size={46} strokeWidth={1.2}/><span>{guide.category}</span><button className={`save-button ${saved?'is-saved':''}`} aria-label={`${saved?'Open saved plan for':'Save'} ${guide.title}`} onClick={()=>saved?openGuide(guide):saveGuide(guide)}><Bookmark size={19} fill={saved?'currentColor':'none'}/></button></div>
      <div className="guide-content"><div className="guide-meta"><span><Clock3 size={14}/>{guide.duration} min</span><span className="meta-dot">·</span><span>{guide.difficulty}</span></div><h3>{guide.title}</h3><p>{guide.summary}</p><button className="text-button card-action" onClick={()=>openGuide(guide)}>Explore repair <ChevronRight size={17}/></button></div>
    </article>;
  }

  return <div className="app-shell" data-ready={ready}>
    <aside className={`sidebar ${mobileMenu?'sidebar-open':''}`} aria-label="Main navigation">
      <a className="brand" href={base} onClick={e=>{e.preventDefault();navigate('discover');}}><span className="brand-mark"><Scissors size={22} strokeWidth={1.7}/></span>mend<span className="brand-period">.</span></a>
      <div className="sidebar-caption">LESS WASTE. MORE LIFE.</div>
      <nav>{nav.map(item=><button key={item.id} className={`nav-item ${view===item.id?'active':''}`} aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}><item.icon size={20}/>{item.name}{item.id==='saved'&&inProgress.length>0&&<span className="nav-count">{inProgress.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="care-card"><span className="care-icon"><Heart size={21}/></span><strong>A little care goes<br/>a long way.</strong><p>Start small. Keep something<br/>you love in use.</p><button onClick={()=>navigate('planner')}>Make a repair plan <Plus size={15}/></button></div><button className={`nav-item about-link ${view==='about'?'active':''}`} onClick={()=>navigate('about')}><Info size={19}/>About Mend</button><div className="sidebar-foot">Made for a longer life <Sprout size={14}/></div></div>
    </aside>
    {mobileMenu&&<button className="menu-overlay" aria-label="Close navigation" onClick={()=>setMobileMenu(false)}/>}
    <div className="workspace">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-toggle" aria-label="Open navigation" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={22}/></button><span className="breadcrumb">Your everyday repair room</span></div><div className="topbar-right"><span className="local-note"><span className="tiny-dot"/>No account needed</span><button className="icon-button help-button" aria-label="How Mend works" onClick={()=>navigate('about')}><Info size={20}/></button></div></header>
      <main id="main" className="main-content">
        {storageError&&<div className="notice" role="alert">{storageError==='corrupt'?'Your saved browser data couldn’t be read. We’ve started with an empty repair shelf.':'Your browser can’t save progress right now. Keep this tab open and export your journal before leaving.'}</div>}
        {view==='discover'&&<>
          <div className="page-heading"><div><div className="eyebrow">GOOD THINGS, KEPT GOING</div><h1>Let’s make things last.</h1></div><span className="library-label"><span className={`tiny-dot ${library.mode==='sample'?'sample-dot':''}`}/>{library.mode==='sanity'?'Live repair library':'Sample repair library'}</span></div>
          <section className="hero"><img className="hero-image" src={`${base}images/workbench.webp`} alt="A lilac sweater with a visible orange repair, sewing scissors, thread and buttons on a green workbench" width="1536" height="1024" fetchPriority="high"/><div className="hero-copy"><span className="hero-kicker"><Sparkles size={15}/> A SECOND LIFE STARTS HERE</span><h2>Still good.<br/>Just needs a little <em>love.</em></h2><p>A loose button. An open seam. Small fixes<br className="desktop-br"/> that keep your favorites out of the bin.</p><button className="button primary" onClick={()=>navigate('planner')}><Wrench size={17}/>Find my repair</button></div></section>
          <div className="principles"><span><span className="principle-icon mint"><Sprout size={18}/></span>Repair before replacing</span><span><span className="principle-icon lilac"><Scissors size={18}/></span>Work with what you have</span><span><span className="principle-icon peach"><Bookmark size={18}/></span>Keep your progress, privately</span></div>
          <section className="library-section" aria-labelledby="library-title"><div className="section-heading"><div><h2 id="library-title">A small fix worth making.</h2><p>Practical, sourced repairs for everyday things.</p></div><span className="results-count">{filtered.length} repairs to explore</span></div>
          <div className="library-controls"><div className="category-tabs" role="group" aria-label="Filter by category">{categories.map(c=><button key={c} className={category===c?'selected':''} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="search-box"><Search size={18}/><input type="search" aria-label="Search repairs" placeholder="Find a fix…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
          <div className="filter-row"><button className={`filter-chip ${quick?'selected':''}`} aria-pressed={quick} onClick={()=>setQuick(!quick)}><Clock3 size={14}/>20 minutes or less{quick&&<X size={13}/>}</button><span>Useful skills. No fancy kit required.</span></div>
          {filtered.length?<div className="guide-grid">{filtered.map(guide=><GuideCard guide={guide} key={guide._id}/>)}</div>:<div className="empty-state"><Search size={30}/><h3>No repairs found just yet.</h3><p>Try a different search or open up your filters.</p><button className="button secondary" onClick={()=>{setSearch('');setCategory('All repairs');setQuick(false);}}>Clear filters</button></div>}
          </section><div className="bottom-note"><Sprout size={21}/><p>The most sustainable thing might be the one you already own.</p><button className="text-button" onClick={()=>navigate('impact')}>See your impact <ChevronRight size={16}/></button></div>
        </>}

        {view==='planner'&&<>
          <div className="page-heading"><div><div className="eyebrow">A PLAN THAT FITS YOUR DAY</div><h1>Start with what you have.</h1><p>Tell us your time and tools. Find a repair you can actually do.</p></div><span className="round-heading-icon lilac"><Scissors size={29}/></span></div>
          <div className="planner-layout"><section className="planner-form panel"><h2><span className="step-number">1</span>What needs a little care?</h2><div className="choice-grid">{categories.slice(1).map((c,i)=>{const Icon=[Shirt,Backpack,Sofa][i];return <button key={c} className={`category-choice ${planCategory===c?'selected':''}`} aria-pressed={planCategory===c} onClick={()=>setPlanCategory(c)}><Icon size={25}/>{c}</button>;})}</div><h2><span className="step-number">2</span>How much time do you have?</h2><div className="time-choices">{[15,30,60].map(m=><button key={m} aria-pressed={minutes===m} className={minutes===m?'selected':''} onClick={()=>setMinutes(m)}>{m} minutes</button>)}</div><h2><span className="step-number">3</span>What’s in your kit?</h2><p className="muted">It’s okay to be missing something. We’ll show you what to borrow or find.</p><div className="tool-list">{library.tools.map(t=><label className="tool-option" key={t._id}><input type="checkbox" checked={owned.includes(t._id)} onChange={()=>setOwned(old=>old.includes(t._id)?old.filter(x=>x!==t._id):[...old,t._id])}/><span><strong>{t.name}</strong><small>{t.description}</small></span></label>)}</div><div className="private-note"><Bookmark size={15}/>Your kit stays on this device.</div></section>
          <section className="planner-results"><div className="section-heading"><div><h2>Your possible next fixes</h2><p>{matches.length} {matches.length===1?'repair fits':'repairs fit'} your {minutes}-minute window.</p></div></div>{matches.length?matches.map(g=>{const Icon=icons[g.icon]||Shirt;const missing=missingTools(g,owned);return <article className="match-card panel" key={g._id}><span className={`match-icon ${g.color}`}><Icon size={28}/></span><div className="match-details"><span className="guide-meta">{g.duration} min · {g.difficulty}</span><h3>{g.title}</h3><p>{g.symptom}</p><span className={`readiness ${missing.length?'needs-tools':'ready-tools'}`}>{missing.length?<><Info size={14}/>Find {missing.length} {missing.length===1?'tool':'tools'}</>:<><CheckCircle2 size={14}/>You have the tools</>}</span>{missing.length>0&&<p className="missing-tools">{missing.map(t=>t.name).join(' · ')}</p>}<button className="button secondary" onClick={()=>saveGuide(g,true)}>Make this my plan</button></div></article>;}):<div className="empty-state panel"><Clock3 size={30}/><h3>Give this repair a little more time.</h3><p>No {planCategory.toLowerCase()} repairs fit this window. Try 30 minutes or another category.</p><button className="button secondary" onClick={()=>setMinutes(30)}>Try 30 minutes</button></div>}<div className="planner-tip"><Sprout size={21}/><div><strong>Borrow before you buy.</strong><p>A friend, local repair café, or tool library may have the kit you need.</p><a href="https://www.repaircafe.org/en/visit/" target="_blank" rel="noreferrer">Find a repair café <ArrowUpRight size={14}/></a></div></div></section></div>
        </>}

        {view==='saved'&&<>
          <div className="page-heading"><div><div className="eyebrow">YOUR WORK IN PROGRESS</div><h1>A shelf of second chances.</h1><p>Your saved repairs and checklists, right where you left them.</p></div><button className="button secondary" onClick={exportRepairs} disabled={!repairs.length}><Download size={16}/>Export journal</button></div>
          <div className="category-tabs shelf-tabs" role="group" aria-label="Filter saved repairs">{['In progress','Completed','All'].map(f=><button className={savedFilter===f?'selected':''} aria-pressed={savedFilter===f} onClick={()=>setSavedFilter(f)} key={f}>{f}{f==='In progress'&&` (${inProgress.length})`}</button>)}</div>
          {repairs.filter(r=>savedFilter==='All'||(savedFilter==='Completed'?!!r.completedAt:!r.completedAt)).length?<div className="saved-grid">{repairs.filter(r=>savedFilter==='All'||(savedFilter==='Completed'?!!r.completedAt:!r.completedAt)).map(r=>{const g=library.guides.find(g=>g._id===r.guideId);const total=g?.steps.length||4;return <article className="saved-card panel" key={r.id}><span className={`match-icon ${g?.color || 'mint'}`}>{r.completedAt?<CheckCircle2 size={27}/>:<Bookmark size={27}/>}</span><div className="saved-content"><span className="guide-meta">{r.completedAt?'Kept in use':'A little work in progress'}</span><h3>{r.title}</h3><div className="progress-track"><span style={{width:`${Math.min(100,r.checkedSteps.length/total*100)}%`}}/></div><p>{r.checkedSteps.length} of {total} steps done</p><button className="text-button" onClick={()=>g?openGuide(g,r):notify('This guide is no longer in the library. Export your journal to keep its progress.')} disabled={!g}>{r.completedAt?'View repair':'Continue repair'}<ChevronRight size={16}/></button></div><button className="icon-button remove-plan" aria-label={`Remove ${r.title} from shelf`} onClick={()=>{setActiveRepairId(r.id);setResetDialog(true);}}><X size={17}/></button></article>;})}</div>:<div className="empty-state large-empty"><span className="empty-icon"><Bookmark size={35}/></span><h2>{savedFilter==='Completed'?'Your first second chance is waiting.':'Something worth keeping?'}</h2><p>{savedFilter==='Completed'?'Finish a saved checklist to add your first completed repair.':'Save a repair from the library. We’ll keep your checklist here on this device.'}</p><button className="button primary" onClick={()=>navigate('discover')}>Explore repairs</button></div>}
          <p className="privacy-footnote"><Info size={15}/>Your shelf is saved in this browser. Export it before switching devices or clearing browser data.</p>
        </>}

        {view==='impact'&&<>
          <div className="page-heading"><div><div className="eyebrow">SMALL ACTS ADD UP</div><h1>Good things, still going.</h1><p>A record of what you’ve repaired. Every item counts.</p></div><span className="round-heading-icon mint"><Sprout size={30}/></span></div>
          <div className="impact-hero"><div><span className="hero-kicker">YOUR PERSONAL REPAIR JOURNAL</span><h2>{stats.count ? `${stats.count} ${stats.count===1?'thing':'things'}. A longer story.`:'Your next repair is a good place to start.'}</h2><p>{stats.count?'That’s a little more care, a little less replacement. Keep going.':'Fix one small thing, finish your checklist, and watch your journal grow.'}</p><button className="button primary" onClick={()=>navigate('planner')}>Find the next repair</button></div><div className="impact-emblem"><Sprout size={90} strokeWidth={1}/></div></div>
          <div className="impact-stats"><article className="panel"><span className="principle-icon mint"><CheckCircle2 size={21}/></span><strong>{stats.count}</strong><h3>Items repaired</h3><p>Repairs you marked complete</p></article><article className="panel"><span className="principle-icon lilac"><Leaf size={21}/></span><strong>{(stats.grams/1000).toLocaleString(undefined,{maximumFractionDigits:2})}<small> kg</small></strong><h3>Items kept in use</h3><p>From weights you entered</p></article><article className="panel"><span className="principle-icon peach"><Wrench size={21}/></span><strong>{inProgress.length}</strong><h3>Second chances underway</h3><p>Saved plans ready when you are</p></article></div>
          <section className="panel impact-note"><Info size={22}/><div><h3>A useful record. An honest one.</h3><p>These numbers come only from repairs you complete. Item weight is optional and self-reported. Mend doesn’t calculate carbon savings or claim that a repaired item would otherwise have been thrown away.</p></div></section>
          {stats.count>0&&<section className="panel impact-breakdown"><h2>Your repairs by category</h2>{categories.slice(1).map(c=>{const count=repairs.filter(r=>r.completedAt&&library.guides.find(g=>g._id===r.guideId)?.category===c).length;return <div className="breakdown-row" key={c}><span>{c}</span><div className="progress-track"><span style={{width:`${count/stats.count*100}%`}}/></div><strong>{count}</strong></div>;})}</section>}
        </>}

        {view==='about'&&<>
          <div className="page-heading"><div><div className="eyebrow">A LITTLE CARE GOES A LONG WAY</div><h1>Keep the good things.</h1><p>A small, practical corner of the internet for repairing before replacing.</p></div><span className="round-heading-icon peach"><Heart size={29}/></span></div>
          <div className="about-layout"><section className="panel about-story"><h2>More useful than another list of tips.</h2><p>Mend connects a real repair to your available time and tools. Pick a plan, follow the original illustrated source, and keep your progress in a checklist.</p><p>The library focuses on adult clothing, fabric bags, and household textiles. If the damage doesn’t match a guide’s symptom, stop and ask a repair professional.</p><h3>Sources stay close to the advice.</h3><p>Each plan is an independently written preparation checklist with a direct link to its full repair guide. Sources include iFixit and Patagonia’s repair guides. The workbench photograph was generated with AI; it illustrates the idea and is not a repair diagram.</p><h3>Your progress stays yours.</h3><p>No sign-in, advertising, or analytics. Your tool kit, checklists, and item weights stay in this browser. Only the public repair library is fetched from Sanity.</p><a className="button secondary external-button" href="https://www.repaircafe.org/en/visit/" target="_blank" rel="noreferrer">Find hands-on help <ArrowUpRight size={16}/></a></section>
          <div><section className="panel about-data"><span className="sanity-wordmark">STRUCTURED WITH SANITY</span><h2>Care starts with good content.</h2><p>Repair guides link to reusable tool records. Editorial review determines which guides appear here.</p><div className="workflow"><span>Draft</span><ChevronRight size={15}/><span>Review</span><ChevronRight size={15}/><span className="workflow-approved">Approved</span></div><div className="data-status"><span className={`tiny-dot ${library.mode==='sample'?'sample-dot':''}`}/>{library.mode==='sanity'?'Connected to live content':'Using sample content'}</div><button className="button secondary" onClick={refreshLibrary} disabled={refreshing}>{refreshing?'Refreshing…':'Refresh library'}</button><details><summary>Project details</summary><dl><dt>Project ID</dt><dd>{projectId}</dd><dt>Dataset</dt><dd>{dataset}</dd><dt>Frontend</dt><dd>Astro + React · static build</dd></dl><a href={`https://${projectId}.api.sanity.io/v2026-03-01/data/query/${dataset}?query=${encodeURIComponent('*[_type == "repairGuide"]{_id,title,category,review,source}')}`} target="_blank" rel="noreferrer">Open public content <ArrowUpRight size={14}/></a></details></section><div className="about-callout"><Leaf size={24}/><p>You don’t have to fix everything.<br/><strong>Just start with one thing.</strong></p></div></div></div>
        </>}
        <footer className="main-footer"><span>mend. <span>Made for second chances.</span></span><span>Repair thoughtfully. Follow the original guide.</span></footer>
      </main>
    </div>
    {activeGuide&&<Modal title={activeGuide.title} onClose={()=>{setActiveGuide(null);setActiveRepairId(null);}}><div className="repair-dialog-content"><span className={`detail-icon ${activeGuide.color}`}>{(()=>{const Icon=icons[activeGuide.icon]||Shirt;return <Icon size={32}/>;})()}</span><div className="guide-meta">{activeGuide.category} · {activeGuide.duration} minutes · {activeGuide.difficulty}</div><h2>{activeGuide.title}</h2><p className="detail-summary">{activeGuide.summary}</p><div className="symptom-box"><strong>This plan fits</strong><p>{activeGuide.symptom}</p></div><div className="detail-kit"><div><h3>Tools you’ll need</h3>{activeGuide.tools.map(t=><span className="kit-item" key={t._id}>{owned.includes(t._id)?<CheckCircle2 size={15}/>:<Minus size={15}/>} {t.name}</span>)}</div><div><h3>Materials</h3>{activeGuide.materials.map(m=><span className="kit-item" key={m}>{m}</span>)}</div></div><div className="caution"><Info size={19}/><p>{activeGuide.caution}</p></div><a className="source-link" href={activeGuide.source.url} target="_blank" rel="noreferrer"><span><strong>Open the full illustrated guide</strong><small>{activeGuide.source.name}</small></span><ArrowUpRight size={20}/></a><div className="checklist-heading"><h3>Your repair checklist</h3>{activeRepair&&<span>{activeRepair.checkedSteps.length}/{activeGuide.steps.length} done</span>}</div><p className="checklist-intro">Use this checklist alongside the original guide. Save the plan to tick off your progress.</p><div className="repair-steps">{activeGuide.steps.map((s,i)=><label className={`repair-step ${activeRepair?.checkedSteps.includes(s._key)?'checked':''}`} key={s._key}><input type="checkbox" aria-label={s.title} checked={activeRepair?.checkedSteps.includes(s._key)||false} disabled={!activeRepair||!!activeRepair.completedAt} onChange={()=>toggleStep(s._key)}/><span><strong><span className="step-index">{String(i+1).padStart(2,'0')}</span>{s.title}</strong><p>{s.body}</p></span></label>)}</div>
      {activeRepair?.completedAt?<div className="repair-success" role="status"><CheckCircle2 size={23}/><span><strong>One more good thing kept in use.</strong><small>Repaired {new Date(activeRepair.completedAt).toLocaleDateString()} · {activeRepair.weightGrams?`${activeRepair.weightGrams} g recorded`:'No weight recorded'}</small></span></div>:activeRepair?<div className="completion-box"><label htmlFor="item-weight">Approximate item weight in grams <span>(optional)</span></label><input id="item-weight" type="number" min="0" max="100000" placeholder="e.g. 250" value={weight} onChange={e=>setWeight(e.target.value)}/><p>Use a measured weight if you can. Leave blank if you’re unsure.</p><button className="button primary" disabled={!activeGuide.steps.every(s=>activeRepair.checkedSteps.includes(s._key))} onClick={completeRepair}><Check size={17}/>Mark repaired</button></div>:<button className="button primary full-width" onClick={()=>saveGuide(activeGuide,true)}><Bookmark size={17}/>Save my repair plan</button>}
      <button className="text-button print-button" onClick={()=>window.print()}><Printer size={16}/>Print this repair plan</button></div></Modal>}
    {resetDialog&&<Modal title="Remove repair plan" onClose={()=>{setResetDialog(false);setActiveRepairId(null);}}><div className="confirm-dialog"><h2>Remove this repair?</h2><p>Its checklist and any recorded weight will be removed from this device and your impact total.</p><div><button className="button secondary" onClick={()=>{setResetDialog(false);setActiveRepairId(null);}}>Keep it</button><button className="button danger" onClick={()=>{setRepairs(old=>old.filter(r=>r.id!==activeRepairId));setResetDialog(false);setActiveRepairId(null);notify('Repair removed from your shelf');}}>Remove repair</button></div></div></Modal>}
    <div className={`toast ${toast?'visible':''}`} role="status" aria-live="polite">{toast&&<><CheckCircle2 size={18}/>{toast}</>}</div>
  </div>;
}
