'use client';
import {useEffect,useState,useRef} from 'react';
import {modules as moduleCatalog} from '../../lib/modules';
import {iconForModule} from '../../lib/module-icons';
import {LayoutDashboard,Users,Wallet,ReceiptText,History,MessageCircle,Settings,ChevronLeft,ChevronRight,Menu,Search,ArrowUpRight,ExternalLink,RefreshCw,LogOut,Shield,CheckCircle2,Clock3,ShieldCheck,Coins,PanelLeftClose,Pin,EllipsisVertical,UserCircle,ChevronDown,Boxes,ShoppingBag,Bell} from 'lucide-react';

const navigation=[
 {group:'GERAL',items:[{id:'dashboard',label:'Visão geral',icon:LayoutDashboard},{id:'modules',label:'Módulos',icon:Boxes},{id:'store',label:'Shopping / Store',icon:ShoppingBag},{id:'orders',label:'Meus pedidos',icon:ShoppingBag},{id:'notifications',label:'Notificações',icon:Bell},{id:'profile',label:'Minha conta',icon:Users}]},
 {group:'FINANCEIRO',items:[{id:'credits',label:'Créditos e MC',icon:Wallet},{id:'recharges',label:'Solicitar recarga',icon:ReceiptText},{id:'history',label:'Histórico',icon:History}]},
 {group:'FERRAMENTAS',items:moduleCatalog.filter(m=>m.group==='Ferramentas').map(m=>({id:'module:'+m.id,label:m.name,icon:iconForModule(m.id)}))},
 {group:'CHECKERS LEGADOS',items:moduleCatalog.filter(m=>m.group==='Checkers legados').map(m=>({id:'module:'+m.id,label:m.name,icon:iconForModule(m.id)}))},
 {group:'SISTEMA',items:[{id:'keys',label:'Minhas Keys',icon:Shield},{id:'support',label:'Suporte',icon:MessageCircle}]}
];
const money=n=>Number(n||0).toLocaleString('pt-BR');
const rechargeBotUrl='https://t.me/mandrackecenterkeybot?start=recarga';
const time=date=>new Date(date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
const label={pending:'Pendente',approved:'Aprovado',rejected:'Recusado'};
function Tile({title,value,icon:Icon,detail}){
 return <div className="rounded-2xl border border-[#322a3a] bg-[#1b1820] p-5 shadow-[0_8px_30px_#00000020]">
  <div className="mb-6 flex items-center justify-between text-xs text-[#a6a1b0]"><span>{title}</span><Icon size={18} className="text-[#a58acb]"/></div>
  <div className="text-3xl font-semibold tracking-tight text-[#f4f0f9]">{value}</div>
  <div className="mt-2 text-xs text-[#918a9b]">{detail}</div>
 </div>
}
export default function Member(){
 const [data,setData]=useState(null),[error,setError]=useState('');
 const [view,setView]=useState('dashboard'),[narrow,setNarrow]=useState(false),[mobile,setMobile]=useState(false);
 const [creditAmount,setCreditAmount]=useState('100'),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [query,setQuery]=useState('');
 const [moduleStatuses,setModuleStatuses]=useState({}),[offNotice,setOffNotice]=useState(null),[moduleLoading,setModuleLoading]=useState(true);
 const [navOrder,setNavOrder]=useState(Object.fromEntries(navigation.map(g=>[g.group,g.items.map(i=>i.id)])));
 const [navPins,setNavPins]=useState([]),[navMenu,setNavMenu]=useState(null);
 const prefsHydrated=useRef(false);
 useEffect(()=>{
  const initial=new URLSearchParams(window.location.search).get('view');if(initial==='profile')setView('profile');
  async function loadPreferences(){
   try{
    const r=await fetch('/api/ui/preferences',{cache:'no-store'});
    if(r.ok){const data=await r.json(),p=data.preferences?.member_sidebar||{};
     if(p.order&&typeof p.order==='object')setNavOrder(o=>({...o,...p.order}));
     if(Array.isArray(p.pins))setNavPins(p.pins);
     if(typeof p.narrow==='boolean')setNarrow(p.narrow);
    }
   }catch(e){console.warn('Preferências não disponíveis')}finally{prefsHydrated.current=true}
  }
  loadPreferences();refresh();
  fetch('/api/modules',{cache:'no-store',signal:AbortSignal.timeout(12000)}).then(async r=>{if(!r.ok)throw Error('Módulos indisponíveis');return r.json()}).then(d=>{setModuleStatuses(Object.fromEntries((d.modules||[]).map(x=>[x.id,x]))) }).catch(()=>setError('Não foi possível carregar os módulos.')).finally(()=>setModuleLoading(false));
 },[]);
 useEffect(()=>{
  if(!prefsHydrated.current)return;
  const timer=setTimeout(()=>fetch('/api/ui/preferences',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({preferences:{member_sidebar:{order:navOrder,pins:navPins,narrow}}})}).catch(()=>{}),350);
  return()=>clearTimeout(timer);
 },[navOrder,navPins,narrow]);
 async function refresh(){
  try{const r=await fetch('/api/member/me',{cache:'no-store',signal:AbortSignal.timeout(12000)});const out=await r.json();if(!r.ok)throw Error(out.error||'Falha ao consultar conta');setData(out);setError('')}
  catch(e){setError(e.name==='TimeoutError'?'O servidor demorou demais para responder. Atualize os dados ou entre novamente.':e.message||'Falha ao carregar a conta.');}
 }
 async function recharge(e){
  e.preventDefault();setBusy(true);setNotice('');
  try{
   const amount=Number(creditAmount);
   const r=await fetch('/api/member/recharge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credits:amount})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível registrar recarga');
   setNotice(d.message);await refresh();
  }catch(e){setNotice(e.message)}finally{setBusy(false)}
 }
 async function editProfile(){const name=prompt('Nome de exibição',data?.user?.first_name||'');if(name===null)return;try{const r=await fetch('/api/member/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({first_name:name})});const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível salvar');await refresh()}catch(e){setError(e.message)}}
 async function logout(){await fetch('/api/member/logout',{method:'POST'});location.replace('/login')}
 const move=id=>{
  if(id==='notifications'){location.assign('/member/notifications');return;}
  if(id==='store'||id==='orders'){location.assign('/member/store'+(id==='orders'?'?tab=orders':''));return;}
  if(id.startsWith('module:')){
   const moduleId=id.slice(7),module=moduleStatuses[moduleId];
   if(!module){setOffNotice({title:'Módulo indisponível',message:'Não foi possível verificar a permissão desta ferramenta.'});setMobile(false);return;}
   if(module.access==='available'){location.assign('/panel?module='+encodeURIComponent(moduleId));return;}
   const reasons={
    off:module.off_message||'Esta função está temporariamente indisponível.',
    no_credits:'Você pode conhecer todas as ferramentas, mas precisa ter créditos disponíveis para utilizá-las. Solicite uma recarga para liberar o acesso.',
    admin_only:'Esta função é exclusiva do administrador.',
    not_integrated:'Esta ferramenta ainda não possui execução liberada para membros. O catálogo é apenas informativo até a integração segura ser concluída.'
   };
   setOffNotice({title:module.name||moduleId,message:reasons[module.access]||'Acesso indisponível.',access:module.access});setMobile(false);return;
  }
  const moduleId={dashboard:'dashboard',profile:'profile',credits:'credits',recharges:'credits',history:'credits'}[id];
  if(moduleId&&moduleStatuses[moduleId]?.enabled===false){
   setOffNotice({title:moduleId==='credits'?'Créditos':id==='profile'?'Minha conta':'Dashboard',message:moduleStatuses[moduleId].off_message||'Esta função está temporariamente indisponível.'});
   setMobile(false);return;
  }
  setView(id);setMobile(false);setNotice('');
 };
 const toggle=()=>setNarrow(n=>!n);
 const u=data?.user||{},isAdmin=Boolean(data?.is_admin);
 const rows=(data?.recharges||[]).filter(r=>!query||String(r.credits_requested).includes(query)||(label[r.status]||r.status).toLowerCase().includes(query.toLowerCase()));
 const groupItems=g=>g.items.slice().sort((a,b)=>{
  const ids=navOrder[g.group]||[],ai=ids.indexOf(a.id),bi=ids.indexOf(b.id);
  return(ai<0?100:ai)-(bi<0?100:bi);
 });
 const reorder=(group,from,to)=>{
  if(!group||from===to)return;
  const g=navigation.find(x=>x.group===group);if(!g)return;
  const ids=groupItems(g).map(x=>x.id);
  if(!ids.includes(from)||!ids.includes(to))return;
  ids.splice(ids.indexOf(to),0,ids.splice(ids.indexOf(from),1)[0]);
  setNavOrder(p=>({...p,[group]:ids}));
 };
 function navItem(item,section,pinned=false){
  const Icon=item.icon;
  return <div key={(pinned?'pin-':'')+item.id}
   draggable={!pinned}
   onDragStart={e=>{e.dataTransfer.setData('text/plain',JSON.stringify({group:section.group,id:item.id}));e.dataTransfer.effectAllowed='move'}}
   onDragOver={e=>e.preventDefault()}
   onDrop={e=>{e.preventDefault();try{const drag=JSON.parse(e.dataTransfer.getData('text/plain'));if(drag.group===section.group)reorder(section.group,drag.id,item.id)}catch{}}}
   className="relative mb-1 flex items-center">
    <button title={item.label} type="button" onClick={()=>move(item.id)}
     className={'flex h-10 w-full items-center gap-3 !rounded-lg !border !py-2 text-left text-[13px] !font-medium transition-colors '+(narrow?'!justify-center !px-2':'!pl-3 !pr-9')+' '+(view===item.id?'!border-[#574364] !bg-[#2a2630] !text-white':'!border-transparent !bg-transparent !text-[#aaa4b0] hover:!bg-[#242028] hover:!text-white')}>
      <Icon size={17} className="shrink-0 text-[#b09bc8]"/>{!narrow&&<span className="truncate">{item.label}</span>}
    </button>
    {!narrow&&<button type="button" aria-label={'Opções '+item.label} onClick={()=>setNavMenu(navMenu===item.id?null:item.id)} className="absolute right-1 !bg-transparent !px-2 !py-2 text-[#9c91a8]"><EllipsisVertical size={16}/></button>}
    {navMenu===item.id&&<div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#594365] bg-[#271e2e] p-2 shadow-xl"><button className="flex items-center gap-2 !bg-transparent !px-2 !py-2 text-xs" onClick={()=>{setNavPins(x=>x.includes(item.id)?x.filter(k=>k!==item.id):[...x,item.id]);setNavMenu(null)}}><Pin size={14}/>{navPins.includes(item.id)?'Desafixar':'Fixar no topo'}</button></div>}
   </div>;
 }
 const nav=()=><>
  {!!navPins.length&&<section className="mb-7">{!narrow&&<div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#8b789c]">FIXADOS</div>}{navPins.map(id=>{const g=navigation.find(x=>x.items.some(i=>i.id===id)),item=g?.items.find(i=>i.id===id);return item?navItem(item,g,true):null})}</section>}
  {navigation.map(section=><div key={section.group} className="mb-7">
   {!narrow&&<div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#736b7b]">{section.group}</div>}
   {groupItems(section).map(item=>navItem(item,section))}
  </div>)}
 </>;
 return <div className="min-h-screen bg-[#0e0e11] text-[#f0edf4]">
  <div className="flex min-h-screen">
   {mobile&&<button className="fixed inset-0 z-30 !rounded-none !bg-black/70" aria-label="Fechar menu" onClick={()=>setMobile(false)}/>}
   <aside className={(mobile?'translate-x-0':'-translate-x-full md:translate-x-0')+' fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#332c38] bg-[#121115] transition-transform duration-200 md:sticky md:top-0 md:h-screen '+(narrow?'w-[72px]':'w-[242px]')}>
    <div className="flex h-[76px] items-center justify-between border-b border-[#2b262e] px-4">
     <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#6c4a85] bg-[#35233f] font-bold text-[#d0b4e9]">M</div>
      {!narrow&&<div className="min-w-0"><div className="truncate text-[13px] font-semibold tracking-wide">MANDRACKE</div><div className="text-[10px] tracking-[.18em] text-[#a981ca]">CENTER</div></div>}
     </div>
     {!narrow&&<button title="Recolher menu" onClick={toggle} className="!bg-transparent !p-1 text-[#91899a]"><PanelLeftClose size={17}/></button>}
     {narrow&&<button title="Expandir menu" onClick={toggle} className="absolute left-[74px] top-[22px] hidden !bg-[#1d1921] !p-2 text-[#b7a2c8] md:block"><ChevronRight size={15}/></button>}
    </div>
    <div className="flex-1 overflow-y-auto px-3 py-7">{nav()}{isAdmin&&<div className="mt-4 border-t border-[#302a35] pt-4"><a className="flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] text-[#cdb5ec] hover:bg-[#2a2630]" href="/login?admin=1"><Shield size={17}/> {!narrow&&'Administração protegida'}</a></div>}</div>
    <div className="border-t border-[#2e2731] px-3 py-3">
     <button type="button" onClick={logout} title="Sair" className="flex w-full items-center gap-3 !bg-transparent !px-3 !py-2 text-left text-xs !font-medium text-[#a5a0aa] hover:!text-white"><LogOut size={17}/>{!narrow&&'Encerrar sessão'}</button>
     {!narrow&&<div className="mt-3 px-3 text-[10px] text-[#797380]">MANDRACKE CENTER · v1</div>}
    </div>
   </aside>
   <main className="min-w-0 flex-1">
    <header className="flex h-[76px] items-center justify-between border-b border-[#322a37] bg-[#131115] px-5 md:px-9">
     <div className="flex min-w-0 items-center gap-3"><button aria-label="Abrir menu" onClick={()=>setMobile(true)} className="!bg-transparent !p-1 md:hidden"><Menu size={20}/></button><span className="text-[13px] font-medium">Central do usuário</span><span className="text-xs text-[#736b78]">/</span><span className="truncate text-xs text-[#b7a5c8]">{navigation.flatMap(n=>n.items).find(n=>n.id===view)?.label}</span></div>
     <div className="flex items-center gap-3"><span className="hidden rounded-full border border-[#624a74] bg-[#31263c] px-3 py-1 text-[10px] font-bold tracking-[.08em] text-[#dbbfff] sm:block">{u.effective_plan||'FREE'}</span><button aria-label="Atualizar conta" title="Atualizar dados" onClick={refresh} className="!bg-transparent !p-2 text-[#aaa3b2]"><RefreshCw size={17}/></button><div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#614d74] bg-[#342443] text-sm font-semibold text-[#d7b9f2]">{u.has_photo?<img src="/api/member/photo" alt="Perfil" className="h-full w-full object-cover"/>:(u.username||u.first_name||'M').slice(0,1).toUpperCase()}</div></div>
    </header>
    <div className="mx-auto max-w-[1280px] space-y-7 px-5 pb-16 pt-9 md:px-9">
     {error&&<div className="rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200" role="alert">{error} <a className="ml-2 underline" href="/login">Entrar novamente</a></div>}
     {!data&&!error&&<div className="animate-pulse text-sm text-[#a4a0ab]">Carregando seus dados...</div>}
     {data&&<>
     {isAdmin&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#78529c] bg-[#2a1c38] p-4">
       <div className="text-sm"><b>🛡 Conta administrativa reconhecida</b><p className="mt-1 text-xs text-[#baa3cf]">Sua conta Telegram tem acesso aos módulos e controles de administração.</p></div>
       <a href="/admin/dashboard" className="rounded-xl bg-[#765099] px-4 py-3 text-xs font-semibold text-white">Abrir painel administrativo</a>
       <a href="/admin/modules" className="rounded-xl border border-[#8261a0] px-4 py-3 text-xs text-[#e8d3f7]">Gerenciar módulos</a>
     </div>}
     {!isAdmin&&Number(u.credits)<=0&&<div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#775b3a] bg-[#2b221c] p-4">
       <div><b className="text-sm text-[#f4d1a1]">Saldo insuficiente</b><p className="mt-1 text-xs text-[#d2bda6]">Você pode visualizar todos os módulos. Para executar ferramentas é necessário ter créditos aprovados em sua conta.</p></div>
       <a href={rechargeBotUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#73513d] px-4 py-3 text-xs font-semibold text-white hover:bg-[#896347]">💬 Colocar créditos pelo bot ↗</a>
     </div>}
     <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 text-[11px] font-semibold uppercase tracking-[.19em] text-[#a480c8]">MANDRACKE / {view==='dashboard'?'Visão geral':view.toUpperCase()}</div><h1 className="!m-0 text-[28px] font-semibold tracking-tight text-[#f8f4fc] md:text-3xl">{view==='dashboard'?'Seu painel':navigation.flatMap(n=>n.items).find(n=>n.id===view)?.label}</h1><p className="mt-2 text-sm text-[#8f8899]">Bem-vindo, {u.first_name||u.username||'usuário'} · Conta vinculada ao Telegram</p></div><div className="flex items-center gap-2 rounded-full border border-[#3d3843] bg-[#1b1920] px-3 py-2 text-[11px] text-[#c2b9ca]"><span className="h-2 w-2 rounded-full bg-emerald-400"/>Conta ativa</div></div>
     {['dashboard','credits'].includes(view)&&<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
       <Tile title="Créditos disponíveis" value={money(u.credits)} icon={Wallet} detail="Saldo consultado no Supabase"/>
       <Tile title="Plano ativo" value={u.effective_plan} icon={ShieldCheck} detail={u.promo_pro_until&&new Date(u.promo_pro_until)>new Date()&&Number(u.credits)>0?'PRO promocional até '+time(u.promo_pro_until):Number(u.credits)<=0?'Sem créditos: execução bloqueada':'Definido pela administração'}/>
       <Tile title="Saldo MC" value={isAdmin?money(u.mc_tokens):'—'} icon={Coins} detail={isAdmin?'1.500 MC renováveis a cada dia':'Disponível apenas para administração'}/>
       <Tile title="Solicitações" value={money((data.recharges||[]).length)} icon={ReceiptText} detail={(data.recharges||[]).filter(r=>r.status==='pending').length+' pendente(s)'}/>
     </div>}
     {view==='dashboard'&&<div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
       <section className="overflow-hidden rounded-2xl border border-[#342c3a] bg-[#19161e]"><div className="flex items-center justify-between border-b border-[#302a34] px-5 py-4"><h2 className="text-[15px] font-semibold">Atividade da conta</h2><button className="!bg-transparent !p-1 text-xs text-[#bf9ae9]" onClick={()=>move('history')}>Ver histórico <ArrowUpRight size={13} className="inline"/></button></div>
       <div className="overflow-x-auto"><table className="w-full text-left text-[12px]"><thead className="bg-[#211d25] text-[#a69dad]"><tr><th className="px-5 py-3 font-medium">Solicitação</th><th className="px-5 py-3 font-medium">Créditos</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Data</th></tr></thead><tbody>{(data.recharges||[]).slice(0,8).map(r=><tr key={r.id} className="border-t border-[#2c2731]"><td className="px-5 py-3 text-[#d3cbd9]">Recarga</td><td className="px-5 py-3">{money(r.credits_requested)}</td><td className="px-5 py-3"><span className={'rounded-full px-2 py-1 text-[10px] '+(r.status==='approved'?'bg-emerald-900/30 text-emerald-300':r.status==='rejected'?'bg-rose-900/30 text-rose-300':'bg-amber-900/30 text-amber-300')}>{label[r.status]||r.status}</span></td><td className="whitespace-nowrap px-5 py-3 text-[#91899b]">{time(r.created_at)}</td></tr>)}{!data.recharges?.length&&<tr><td colSpan={4} className="px-5 py-10 text-center text-[#92899d]">Nenhuma movimentação registrada.</td></tr>}</tbody></table></div></section>
       <section className="rounded-2xl border border-[#342c3a] bg-[#19161e] p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-[15px] font-semibold">Acesso e segurança</h2><Shield size={17} className="text-[#a98ad0]"/></div><p className="text-sm leading-6 text-[#afa4b7]">Você está autenticado pelo Telegram ID <b className="text-[#e8ddf2]">{u.telegram_id}</b>.</p><p className="my-4 text-xs text-[#9f96ac]">Origem: {data.source||'Telegram'}. Sua key é permanente até ser revogada. Links temporários de acesso expiram automaticamente.</p><button className="!border !border-[#554064] !bg-[#302538] !px-4 !py-2 text-xs" onClick={()=>move('profile')}>Dados da conta</button></section>
     </div>}
     {view==='modules'&&<section className="overflow-hidden rounded-2xl border border-[#342c3a] bg-[#19161e]">
   <div className="flex flex-wrap items-center justify-between border-b border-[#322a37] p-6"><div><h2 className="text-[15px] font-semibold">Módulos da plataforma</h2><p className="mt-2 text-xs text-[#a79bac]">Todas as funções cadastradas são exibidas aqui. O status é controlado somente pela administração.</p></div>{isAdmin&&<a href="/admin/modules" className="mt-3 rounded-lg border border-[#684980] bg-[#34263e] px-4 py-2 text-xs text-[#e6cafa]">Gerenciar ON/OFF</a>}</div>
   <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
    {Object.entries(moduleStatuses).map(([id,status])=>{
     const names={extractor:'Extrator',formatcc:'Formatar dados',formatlogin:'Formatar login',bin:'BIN Lookup',ip:'IP Locator',geradorbr:'Gerador BR',geradorgg:'Gerador GG',zeroauth:'ZEROAUTH',preauth:'PREAUTH',zeroauthv2:'ZEROAUTH V2',amazon:'Amazon BR',drogasil:'DrogaSil'};
     return <div key={id} className="rounded-xl border border-[#40334b] bg-[#231d2a] p-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{names[id]||id}</span><span className={'rounded px-2 py-1 text-[10px] '+(status.enabled?'bg-emerald-900/30 text-emerald-300':'bg-rose-900/40 text-rose-300')}>{status.access==='no_credits'?'SEM CRÉDITOS':status.access==='admin_only'?'ADMIN':status.access==='not_integrated'?'EM PREPARAÇÃO':status.enabled?'ON':'OFF'}</span></div>
     <p className="mt-3 text-xs text-[#9e91ac]">{status.access==='no_credits'?'Visível para conhecer. Bloqueado por falta de créditos.':status.access==='admin_only'?'Acesso exclusivo do administrador.':status.access==='not_integrated'?'Módulo visível; execução ainda não integrada para membros.':status.access==='off'?status.off_message :'Disponível para uso.'}</p>
     <button type="button" className="mt-3 !border !border-[#5c4670] !bg-[#34273e] !px-3 !py-2 text-xs" onClick={()=>status.access==='no_credits'?window.open(rechargeBotUrl,'_blank','noopener,noreferrer'):move('module:'+id)}>{status.access==='no_credits'?'💬 Recarregar pelo bot':status.access==='available'?'Abrir módulo':'Ver detalhes'}</button>
     
     </div>
    })}
    {!Object.keys(moduleStatuses).length&&<p className="text-sm text-[#a69bac]">{moduleLoading?'Consultando o catálogo de módulos...':'Não foi possível carregar o catálogo.'}</p>}
   </div></section>}
     {view==='keys'&&<section className="rounded-2xl border border-[#342c3a] bg-[#19161e] p-6"><h2 className="text-lg font-semibold">Minhas Keys</h2><p className="mt-2 text-sm text-[#aaa0ae]">Gerencie suas keys e revogue acessos antigos.</p><a className="mt-4 inline-flex rounded-xl bg-[#62467d] px-4 py-3 text-sm" href="/member/keys">Abrir gerenciador de keys</a></section>}
     {view==='profile'&&<section className="max-w-3xl overflow-hidden rounded-2xl border border-[#342c3a] bg-[#19161e]"><div className="border-b border-[#332c3a] p-6"><h2 className="text-[15px] font-semibold">Identificação da conta</h2><button onClick={editProfile} className="mt-3 rounded-lg border border-[#644878] bg-[#33263e] px-3 py-2 text-xs">Editar nome de exibição</button><p className="mt-1 text-xs text-[#8e8795]">Informações fornecidas pelo Telegram e pelo sistema.</p></div><div className="divide-y divide-[#302a36]">{[['Nome',u.first_name||'Não informado'],['Usuário Telegram','@'+(u.username||'não cadastrado')],['Telegram ID',u.telegram_id],['Origem de acesso',data.source],['Plano',u.effective_plan],['Sessão','Autenticado']].map(([k,v])=><div key={k} className="flex items-center justify-between gap-5 px-6 py-4 text-sm"><span className="text-[#968d9e]">{k}</span><span className="text-right font-medium">{v}</span></div>)}</div></section>}
     {view==='credits'&&<section className="max-w-3xl rounded-2xl border border-[#342c3a] bg-[#19161e] p-6"><h2 className="text-[15px] font-semibold">Informações sobre créditos</h2><p className="mt-3 text-sm leading-6 text-[#a69eaf]">Créditos são unidades internas do serviço. Alterações de saldo dependem das regras e aprovações administrativas. {isAdmin?'Os 1.000 créditos e 1.500 MC do administrador são renovados na primeira consulta após a meia-noite de Brasília.':''}</p><button className="mt-5 !bg-[#493458] !px-4 !py-2 text-xs" onClick={()=>move('recharges')}>Solicitar recarga</button></section>}
     {view==='recharges'&&<section className="max-w-2xl rounded-2xl border border-[#342c3a] bg-[#19161e] p-6"><h2 className="text-[15px] font-semibold">Solicitar créditos</h2><p className="mt-2 text-xs leading-5 text-[#a098ac]">Solicitações precisam de aprovação; nenhum pagamento é processado automaticamente.</p><form className="mt-6 space-y-4" onSubmit={recharge}><label htmlFor="credits" className="block text-xs font-medium text-[#b9afc4]">Quantidade de créditos</label><input id="credits" type="number" min="1" max="100000" value={creditAmount} onChange={e=>setCreditAmount(e.target.value)} required className="w-full !rounded-xl !border !border-[#524059] !bg-[#0f0d13] !px-4 !py-3 !text-sm text-white focus:!border-[#ac81d5]"/><button disabled={busy} className="!rounded-xl !bg-[#684a86] !px-5 !py-3 !text-sm hover:!bg-[#79599a]">{busy?'Registrando...':'Solicitar recarga'}</button></form>{notice&&<p className="mt-4 text-sm text-[#d2b5f3]" role="status">{notice}</p>}</section>}
     {view==='history'&&<section className="overflow-hidden rounded-2xl border border-[#342c3a] bg-[#19161e]"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#322b38] p-5"><div><h2 className="text-[15px] font-semibold">Histórico de recargas</h2><p className="mt-1 text-xs text-[#978e9e]">Dados reais do servidor</p></div><div className="flex items-center gap-2 rounded-xl border border-[#3f3646] bg-[#221e27] px-3"><Search size={16} className="text-[#93899e]"/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-40 !bg-transparent !py-3 text-xs !text-white outline-none" placeholder="Buscar..."/></div></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-[#241f28] text-[#afa2b8]"><th className="px-5 py-4">Data</th><th className="px-5 py-4">Créditos</th><th className="px-5 py-4">Situação</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t border-[#322a37]"><td className="px-5 py-4">{time(r.created_at)}</td><td className="px-5 py-4">{money(r.credits_requested)}</td><td className="px-5 py-4 text-[#c7b4d7]">{label[r.status]||r.status}</td></tr>)}{!rows.length&&<tr><td colSpan={3} className="px-5 py-10 text-center text-[#928a99]">Nenhum registro encontrado.</td></tr>}</tbody></table></div></section>}
     {view==='support'&&<section className="max-w-2xl rounded-2xl border border-[#342c3a] bg-[#19161e] p-6"><MessageCircle size={25} className="text-[#ab86d1]"/><h2 className="mt-4 text-lg font-semibold">Central de suporte</h2><p className="mt-3 text-sm text-[#afa6b9]">Precisa de ajuda com sua conta, key ou recarga? Fale com a equipe pelo Telegram.</p><a href="https://t.me/mandracke" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#62467d] px-4 py-3 text-xs font-medium text-white">Abrir suporte <ExternalLink size={14}/></a></section>}
     </>}
    </div>
   </main>
  </div>
  {offNotice&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm" role="presentation" onClick={()=>setOffNotice(null)}>
   <section role="dialog" aria-modal="true" aria-labelledby="module-off-title" className="w-full max-w-md rounded-[22px] border border-[#705087] bg-[#191322] p-7 shadow-[0_30px_90px_#000c]" onClick={e=>e.stopPropagation()}>
    <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl border border-[#674b7c] bg-[#332342] text-2xl text-[#d5b3ee]">⏻</div>
    <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[#b995da]">MANDRACKE CENTER</div>
    <h2 id="module-off-title" className="mb-3 mt-2 text-2xl font-semibold">{offNotice.title} — OFF</h2>
    <p className="text-sm leading-6 text-[#c1b2cc]">{offNotice.message}</p>
    {offNotice.access==='no_credits'&&<a href={rechargeBotUrl} target="_blank" rel="noopener noreferrer" className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#73513d] px-4 py-3 text-sm font-semibold text-white">💬 Colocar créditos pelo bot ↗</a>}
    <button onClick={()=>setOffNotice(null)} className="mt-3 w-full !bg-[#684784]">Entendido</button>
   </section>
  </div>}
 </div>;
}
