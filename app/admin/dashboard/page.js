'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {iconForModule} from '../../../lib/module-icons';
import {LayoutDashboard,Users,Wallet,ChartNoAxesCombined,Settings,History,PanelLeftClose,PanelLeft,Search,ChevronDown,MoreVertical,Pin,GripVertical,RefreshCw,ArrowUpRight,Shield,LogOut,ExternalLink,Clock3,CheckCircle2,MessageCircle,Menu,Filter,Coins,SlidersHorizontal,KeyRound,MonitorCog,Settings2,FileText,Globe,Database, CreditCard, ShoppingBag, Bell, ShieldCheck, Activity, CircleCheck, Lock, Send, UserRound, Info, Copy} from 'lucide-react';

const groups=[
 {name:'GERAL',items:[{id:'overview',label:'Visão geral',icon:LayoutDashboard},{id:'users',label:'Usuários',icon:Users},{id:'recharges',label:'Recargas',icon:Wallet}]},
 {name:'FERRAMENTAS',items:[{id:'extractor',label:'Extrator',icon:iconForModule('extractor')},{id:'formatcc',label:'Formatar dados',icon:iconForModule('formatcc')},{id:'formatlogin',label:'Formatar login',icon:iconForModule('formatlogin')},{id:'bin',label:'BIN Lookup',icon:iconForModule('bin')},{id:'bin-directory',label:'Diretório de BINs',icon:CreditCard},{id:'store',label:'Shopping / Store',icon:ShoppingBag},{id:'notifications',label:'Notificações',icon:Bell},{id:'ip',label:'IP Locator',icon:iconForModule('ip')},{id:'geradorbr',label:'Gerador BR',icon:iconForModule('geradorbr')},{id:'geradorgg',label:'Gerador GG',icon:iconForModule('geradorgg')}]},
 {name:'CHECKERS LEGADOS',items:[{id:'zeroauth',label:'ZEROAUTH',icon:iconForModule('zeroauth')},{id:'preauth',label:'PREAUTH',icon:iconForModule('preauth')},{id:'zeroauthv2',label:'ZEROAUTH V2',icon:iconForModule('zeroauthv2')},{id:'amazon',label:'Amazon BR',icon:iconForModule('amazon')},{id:'drogasil',label:'DrogaSil',icon:iconForModule('drogasil')},{id:'adyen',label:'Check Adyen',icon:iconForModule('adyen')}]}],
 {name:'ADMINISTRAÇÃO',items:[{id:'modules',label:'Gerenciar módulos',icon:Settings2},{id:'operations',label:'Central de Operações',icon:MonitorCog},{id:'keys',label:'Gerenciar Keys',icon:KeyRound},{id:'telegram',label:'Bot Telegram',icon:iconForModule('telegram')},{id:'settings',label:'Configurações',icon:Settings},{id:'legacy',label:'Painel original completo',icon:SlidersHorizontal}]}
];
const initialOrder=Object.fromEntries(groups.map(g=>[g.name,g.items.map(x=>x.id)]));
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const time=s=>s?new Date(s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
function Stat({label,value,icon:Icon,sub}){return <div className="rounded-2xl border border-[#342c3a] bg-[#1b1820] p-5"><div className="mb-5 flex items-center justify-between text-xs text-[#a79ea9]">{label}<Icon size={17} className="text-[#b996dc]"/></div><div className="text-[29px] font-semibold tracking-tight">{fmt(value)}</div><div className="mt-1 text-xs text-[#88818f]">{sub||'Dados do Supabase'}</div></div>}
export default function AdminDashboard(){
 const [section,setSection]=useState('overview'),[collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false),[profileOpen,setProfileOpen]=useState(false);
 const [order,setOrder]=useState(initialOrder),[pins,setPins]=useState([]),[menu,setMenu]=useState(null);
 const [users,setUsers]=useState([]),[recharges,setRecharges]=useState([]),[central,setCentral]=useState(null),[error,setError]=State(''),[busy,setBusy]=useState(false);
 const [query,setQuery]=useState('');
 const [modules,setModules]=useState([]),[self,setSelf]=useState(null);
 const all=groups.flatMap(g=>g.items);
 const hydrated=useRef(false);
 useEffect(()=>{
  async function hydrate(){try{
   const response=await fetch('/api/ui/preferences',{cache:'no-store'});
   if(response.ok){const data=await response.json(),prefs=data.preferences?.admin_sidebar||{};
    if(prefs.order&&typeof prefs.order==='object')setOrder({...initialOrder,...prefs.order});
    if(Array.isArray(prefs.pins))setPins(prefs.pins);
    if(typeof prefs.collapsed==='boolean')setCollapsed(prefs.collapsed);
   }
  }catch(e){console.warn('Preferências indisponíveis')}
  finally{hydrated.current=true}}
  hydrate();reload();
 },[]);
 useEffect(()=>{
  if(!hydrated.current)return;
  const timer=setTimeout(()=>fetch('/api/ui/preferences',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({preferences:{admin_sidebar:{order,pins,collapsed}}})}).catch(()=>{}),350);
  return()=>clearTimeout(timer);
 },[order,pins,collapsed]);
 async function request(path,method='GET',body){
  const r=await fetch(path,{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const payload=await r.json();if(!r.ok)throw Error(payload.error||'Falha na requisição');return payload;
 }
 async function reload(){
  setError('');
  const results=await Promise.allSettled([
   request('/api/admin/users'),
   request('/api/admin/central'),
   request('/api/admin/modules'),
   request('/api/member/me')
  ]);
  if(results[0].status==='fulfilled'){setUsers(results[0].value.users||[]);setRecharges(results[0].value.recharges||[])}
  else setError('Falha ao consultar usuários: '+results[0].reason.message);
  if(results[1].status==='fulfilled')setCentral(results[1].value);
  if(results[2].status==='fulfilled')setModules(results[2].value.modules||[]);
  if(results[3].status==='fulfilled')setSelf(results[3].value);
 }
 async function mutate(data){setBusy(true);try{await request('/api/admin/users','PATCH',data);await reload()}catch(e){alert(e.message)}finally{setBusy(false)}}
 async function updatePlan(u,value){if(!['FREE','PRO','PREMIUM'].includes(value)||!confirm('Definir plano '+value+' para '+u.telegram_id+'?'))return;await mutate({action:'plan',telegram_id:u.telegram_id,plan:value})}
 async function adjust(u){const raw=prompt('Ajustar créditos do usuário '+u.telegram_id+'. Use número positivo para creditar e negativo para debitar.');if(!raw)return;const delta=Number(raw);if(!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>100000)return alert('Valor inválido');if(!confirm('Confirmar ajuste de '+delta+' créditos?'))return;await mutate({action:'credit',telegram_id:u.telegram_id,delta})}
 async function signout(){await Promise.allSettled([fetch('/api/logout',{method:'POST'}),fetch('/api/member/logout',{method:'POST'})]);location.replace('/login?admin=1')}
 const choices=group=>{const ids=order[group.name]||[];return group.items.slice().sort((a,b)=>{const i=ids.indexOf(a.id),j=ids.indexOf(b.id);return(i<0?99:i)-(j<0?99:j)})};
 function reorder(group,id,to){const current=choices(group).map(x=>x.id),from=current.indexOf(id),dest=current.indexOf(to);if(from<0||dest<0)return;current.splice(dest,0,current.splice(from,1)[0]);setOrder(s=>({...s,[group.name]:current}))}
 function link(id){setSection(id);setMenu(null);setMobile(false);if(id==='bin-directory')location.assign('/admin/bin-directory');if(id==='store')location.assign('/admin/store');if(id==='notifications')location.assign('/admin/notifications');if(id==='legacy')location.assign('/panel');if(id==='keys')location.assign('/admin/keys');if(id==='modules')location.assign('/admin/modules');if(id==='operations')location.assign('/admin/central');if(id==='settings')location.assign('/admin/central');if(id==='telegram')location.assign('/panel?module=encodeURIComponent(id)');if(['extractor','formatcc','formatlogin','bin','ip','geradorbr','geradorgg','zeroauth','preauth','zeroauthv2','amazon','drogasil','adyen'].includes(id))location.assign('/panel?module='+encodeURIComponent(id))}
 function itemUI(item,group,duplicate=false){const Icon=item.icon;return <div key={(duplicate?'pin:':'')+item.id} draggable={!duplicate} onDragStart={e=>e.dataTransfer.setData('text/plain',JSON.stringify({group:group?.name,id:item.id}))} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();try{const x=JSON.parse(e.dataTransfer.getData('text/plain'));if(x.group===group?.name)reorder(group,x.id,item.id)}catch{}}} className="group relative mb-1 flex items-center">
  <button onClick={()=>link(item.id)} title={item.label} className={'flex h-[39px] w-full items-center gap-3 !rounded-lg !border !py-2 !font-medium transition-colors '+(collapsed?'!justify-center !px-2':'!pl-3 !pr-10')+' '+(section===item.id?'!border-[#554461] !bg-[#2a262d] !text-white':'!border-transparent !bg-transparent !text-[#aaa5ae] hover:!bg-[#252128] hover:!text-white')}><Icon size={17} className="shrink-0"/>{!collapsed&&<span className="truncate text-[12px]">{item.label}</span>}</button>
  {!collapsed&&<div className="absolute right-0 flex items-center"><button aria-label={'Opções '+item.label} onClick={e=>{e.stopPropagation();setMenu(menu===item.id?null:item.id)}} className="!bg-transparent !p-[7px] text-[#a39aaa] hover:!text-white"><MoreVertical size={15}/></button></div>}
  {menu===item.id&&<div className="absolute right-0 top-10 z-30 w-40 rounded-xl border border-[#4c4055] bg-[#251f2b] p-1 shadow-xl"><button className="flex w-full items-center gap-2 !bg-transparent !px-3 !py-2 text-left text-xs hover:!bg-[#413549]" onClick={()=>{setPins(p=>p.includes(item.id)?p.filter(x=>x!==item.id):[...p,item.id]);setMenu(null)}}><Pin size={14}/>{pins.includes(item.id)?'Desafixar':'Fixar no topo'}</button></div>}
 </div>}
 const filtered=useMemo(()=>users.filter(u=>[u.telegram_id,u.username,u.first_name,u.plan].some(v=>String(v||'').toLowerCase().includes(query.trim().toLowerCase()))),[users,query]);
 const planCounts={FREE:0,PRO:0,PREMIUM:0};users.forEach(u=>{const p=u.effective_plan||u.plan;if(p in planCounts)planCounts[p]++});
 return <div className="min-h-screen bg-[#0e0e11] text-[#f0edf4]"><div className="flex min-h-screen">
 {mobile&&<button aria-label="Fechar menu" className="fixed inset-0 z-30 !rounded-none !bg-black/75" onClick={()=>setMobile(false)}/>}
 <aside className={(mobile?'translate-x-0':'-translate-x-full md:translate-x-0')+' fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#332c38] bg-[#121115] transition-transform duration-200 md:sticky md:top-0 md:h-screen '+(collapsed?'w-[72px]':'w-[242px]')}>
  <div className="flex h-[76px] items-center justify-between border-b border-[#2c282e] px-3"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl border border-[#604472] bg-[#30263a] text-[17px] font-bold text-[#d0b4e3]">M</span>{!collapsed&&<div className="text-[12px] font-semibold tracking-wide">MANDRACKE <span className="text-[#ad83d4]">CENTER</span><div className="text-[10px] font-normal text-[#85808b]">Administração</div></div>}</div>{!collapsed&&<button title="Recolher menu" className="!bg-transparent !p-2 text-[#9b93a4]" onClick={()=>setCollapsed(true)}><PanelLeftClose size={16}/></button>{collapsed&&<button title="Expandir" className="absolute left-[73px] top-[19px] hidden !bg-[#27212c] !p-2 md:block" onClick={()=>setCollapsed(false)}><PanelLeft size={15}/></button>}</div>
  <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-5">
   !!pins.length&&<section className="mb-6">{!collapsed&&<div className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-[#8a7298]">FIXADOS</div>}{pins.map(id=>{const item=all.find(x=>x.id===id);return item?itemUI(item,null,true):null})}</section>
   {groups.map(g=><section key={g.name} className="mb-7">{!collapsed&&<div className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-[#77717b]">{g.name}</div>}{choices(g).map(item=>itemUI(item,g))}</section>)}
  </div>
  <div className="border-t border-[#322b35] p-3"><button onClick={signout} className="flex w-full items-center gap-3 !bg-transparent !px-3 !py-2 text-left text-xs !font-medium text-[#b0a9b5]"><LogOut size={16}/>{!collapsed&&'Sair do painel'}</button></div>
 </aside>
 <div className="min-w-0 flex-1"><header className="flex h-[76px] items-center justify-between border-b border-[#2e2831] bg-[#131115] px-5 md:px-8"><div className="flex items-center gap-3"><button className="!bg-transparent !p-1 md:hidden" aria-label="Abrir menu" onClick={()=>setMobile(true)}><Menu size={20}/></button><span className="text-[13px] font-medium">Central do administrador</span><span className="text-xs text-[#716b76]">/</span><span className="text-xs text-[#ab9ab9]">{section==='users'?'Usuários':section==='recharges'?'Recargas':'Visão geral'}</span></div><div className="flex items-center gap-3"><span className="hidden rounded-full border border-[#624a74] bg-[#31263c] px-3 py-1 text-[10px] font-bold tracking-[.08em] text-[#dbbfff] sm:block">ADMIN</span><button onClick={reload} title="Atualizar" className="!bg-transparent !p-2"><RefreshCw size={17}/></button><a href="/admin/notifications" title="Notificações" aria-label="Notificações" className="rounded-lg p-2 text-[#c3a6dd]"><Bell size={18}/></a><div className="relative"><button onClick={()=>setProfileOpen(x=>!x)} aria-expanded={profileOpen} title="Menu de perfil" className="grid h-9 w-9 place-items-center rounded-full border border-[#5a4562] bg-[#35243f] text-xs">MC</button>{profileOpen&&<div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-[#604572] bg-[#201a27] p-2 shadow-2xl"><a href="/member?view=profile" className="block rounded-lg px-3 py-2 text-xs hover:bg-[#3b2e46]">Editar meu perfil</a><a href="/admin/notifications" className="block rounded-lg px-3 py-2 text-xs hover:bg-[#3b2e46]">Notificações</a><button onClick={signout} className="w-full !bg-transparent !px-3 !py-2 text-left text-xs">Sair da conta</button></div>}</div></div></header>
 <main className="mx-auto max-w-[1380px] space-y-6 px-5 py-8 md:px-8">
  <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#a887c4]">MANDRACKE CENTER · ADMIN</div><h1 className="!m-0 text-[29px] font-semibold">{section==='users'?'Gerenciamento de usuários':section==='recharges'?'Solicitações de recarga':'Seu painel administrativo'}</h1><p className="mt-2 text-sm text-[#908995]">Bem-vindo, {self?.user?.first_name||'Administrador'} · Módulos e dados reais do Supabase</p></div><div className="flex flex-wrap gap-2"><a href="/admin/modules" className="flex items-center gap-2 rounded-xl border border-[#72538c] bg-[#382645] px-4 py-2 text-xs text-[#e6cbff]"><Settings2 size={14}/> Editar módulos ON / OFF</a><a className="flex items-center gap-2 rounded-xl border border-[#4f3e55] bg-[#231e29] px-4 py-2 text-xs text-[#d9bee9]" href="/panel">Todos os módulos <ExternalLink size={13}/></a></div></div>
  {error&&<div className="rounded-xl border border-[#693953] bg-[#341b2a] p-4 text-sm" role="alert">{error}</div>}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
   <Stat label="Usuários cadastrados" value={users.length} icon={Users} sub="Contas registradas no Telegram"/>
   <Stat label="Módulos ativos" value={modules.filter(m=>m.enabled).length} icon={LayoutDashboard} sub={modules.length+' módulos cadastrados'}/>
   <Stat label="Créditos disponíveis" value={self?.user?.credits??0} icon={Wallet} sub={self?.user?'Saldo da sua conta':'Entre pela key para vincular saldo'}/>
   <Stat label="Saldo MC" value={self?.user?.mc_tokens??0} icon={Coins} sub={self?.user?'Unidades MC da sua conta':'Saldo disponível no acesso por Telegram'}/>
  </div>
  {section==='overview'&&<section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
   <div className="overflow-hidden rounded-2xl border border-[#342c3a] bg-[#19161e]">
    <div className="flex items-center justify-between border-b border-[#302a34] px-5 py-4"><h2 className="text-[15px] font-semibold">Módulos da central</h2><a href="/admin/modules" className="text-xs text-[#bf9ae9]">Gerenciar status <ArrowUpRight size={13} className="inline"/></a></div>
    <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
     {modules.map(m=><a key={m.id} href={'/panel?module='+encodeURIComponent(m.id)} className="flex items-center justify-between gap-2 rounded-xl border border-[#3a3142] bg-[#211c27] p-3 text-xs hover:border-[#865fa2]">
        <div className="min-w-0"><div className="truncate font-medium text-[#e7dced]">{m.name}</div><div className="mt-1 text-[10px] text-[#998ea5]">{m.group}</div></div>
        <span className={'shrink-0 rounded-md px-2 py-1 text-[10px] '+(m.enabled?'bg-emerald-900/30 text-emerald-300':'bg-rose-900/40 text-rose-300')}>{m.enabled?'ON':'OFF'}</span>
      </a>)}
     {!modules.length&&<p className="text-sm text-[#a79da9]">Carregando módulos...</p>}
    </div>
   </div>
   <div className="space-y-5">
    <section className="rounded-2xl border border-[#342c3a] bg-[#19161e] p-5"><h2 className="text-[15px] font-semibold">Resumo dos planos</h2><div className="mt-5 space-y-3">
     {Object.entries(planCounts).map(([name,count])=><div key={name} className="flex items-center justify-between border-b border-[#332c38] py-2 text-xs"><span className="text-[#b7a9c2]">{name}</span><span className="font-semibold">{fmt(count)}</span></div>)}
     </div></section>
    <section className="rounded-2xl border border-[#342c3a] bg-[#19161e] p-5"><h2 className="text-[15px] font-semibold">Acesso rápido</h2><div className="mt-4 grid gap-3">
     <a className="flex items-center justify-between rounded-xl border border-[#51405d] bg-[#2a2131] px-4 py-3 text-xs text-[#dec5f1]" href="/admin/modules">Gerenciar módulos ON/OFF <ArrowUpRight size={14}/></a>
     <a className="flex items-center justify-between rounded-xl border border-[#51405d] bg-[#2a2131] px-4 py-3 text-xs text-[#dec5f1]" href="/admin/central">Central de Operações <ArrowUpRight size={14}/></a>
     <a className="flex items-center justify-between rounded-xl border border-[#51405d] bg-[#2a2131] px-4 py-3 text-xs text-[#dec5f1]" href="/panel">Ferramentas originais <ArrowUpRight size={14}/></a>
    </div></section>
   </div>
  </section>}
  {(section==='users'||section==='recharges')&&<section className="overflow-hidden rounded-2xl border border-[#363039] bg-[#19161e]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#332d36] px-5 py-4"><div><h2 className="text-[15px] font-semibold">Usuários</h2><p className="mt-1 text-xs text-[#8c8592]">Gerencie planos, créditos e acessos</p></div><div className="flex items-center gap-2 rounded-xl border border-[#4c4250] bg-[#242028] px-3"><Search size={15} className="text-[#b4a1c0]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nome ou ID..." className="w-48 !bg-transparent !py-3 text-xs !text-white outline-none"/></div></div>
  <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[#221e25] text-[#a6a0ab]"><tr>{['Telegram ID','Usuário','Plano','Créditos','Status','Cadastro','Ações'].map(x=><th className="px-5 py-4 font-medium" key={x}>{x}</th>)}</tr></thead><tbody>{filtered.map(u=><tr className="border-t border-[#2c2830] hover:bg-[#221e26]" key={u.telegram_id}><td className="px-5 py-4 font-mono text-[#b2a0c2]">{u.telegram_id}</td><td className="px-5 py-4"><span className="font-medium text-[#eee8f1]">{u.first_name||u.username||'Conta Telegram'}</span><div className="mt-1 text-[10px] text-[#8b8391]">@{u.username||'sem username'}</div></td><td className="px-5 py-4"><select aria-label={'Plano '+u.telegram_id} value={u.plan||'FREE'} disabled={busy} onChange={e=>updatePlan(u,e.target.value)} className="!rounded-lg !border !border-[#5c4867] !bg-[#302538] !px-2 !py-2 text-[11px] text-[#ead7f6]">{['FREE','PRO','PREMIUM'].map(x=><option key={x}>{x}</option>)}</select></td><td className="px-5 py-4 font-medium">{fmt(u.credits)}</td><td className="px-5 py-4"><span className={'inline-flex rounded-md px-2 py-1 text-[10px] '+(u.enabled?'bg-emerald-950/70 text-emerald-300':'bg-rose-950/70 text-rose-300')}>{u.enabled?'Ativo':'Bloqueado'}</span></td><td className="px-5 py-4 text-[#938a9a]">{time(u.created_at)}</td><td className="px-5 py-4"><div className="flex gap-2"><a title="Gerenciar Keys" href={'/admin/keys?user='+u.telegram_id} className="!border !border-[#554364] !bg-[#2e2734] !px-3 !py-2 text-[11px]">Keys</a><button title="Ajustar créditos" onClick={()=>adjust(u)} className="!border !border-[#554364] !bg-[#2e2734] !px-3 !py-2 text-[11px]">Créditos</button><button title={u.enabled?'Bloquear':'Desbloquear'} onClick={()=>{if(confirm('Alterar acesso da conta?'))mutate({action:'enabled',telegram_id:u.telegram_id,enabled:!u.enabled})}} className="!bg-transparent !px-2 !py-2 text-[11px]">{u.enabled?'Bloquear':'Ativar'}</button></div></td></tr>)}{!filtered.length&&<tr><td colSpan={4} className="px-5 py-10 text-center">Nenhum usuário encontrado.</td></tr>}</tbody></table></div></section>}
  {(section==='recharges')&&<section className="overflow-hidden rounded-2xl border border-[#363039] bg-[#19161e]"><div className="border-b border-[#332d36] p-5 text-[15px] font-semibold">Solicitações</div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-[#221e25] text-[#a6a0ab]"><th className="px-5 py-4">ID Telegram</th><th className="px-5 py-4">Créditos</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Ação</th></tr></thead><tbody>{recharges.map(r=><tr key={r.id} className="border-t border-[#322c36]"><td className="px-5 py-4">{r.telegram_id}</td><td className="px-5 py-4">{fmt(r.credits_requested)}</td><td className="px-5 py-4">{r.status}</td><td className="px-5 py-4">{r.status==='pending'&&<div className="flex gap-2"><button disabled={busy} onClick={()=>{if(confirm('Aprovar e creditar?'))mutate({action:'approve',recharge_id:r.id})}} className="!bg-[#4d3b5f] !px-3 !py-2 text-xs">Aprovar</button><button disabled={busy} onClick={()=>{if(confirm('Recusar pedido?'))mutate({action:'reject',recharge_id:r.id})}} className="!bg-[#312937] !px-3 !py-2 text-xs">Recusar</button></div>}</td></tr>)}{!recharges.length&&<tr><td colSpan={4} className="px-5 py-10 text-center">Nenhuma solicitação.</td></tr>}</tbody></table></div></section>}
  {section==='overview'&&<div className="grid gap-5 md:grid-cols-2"><a href="/admin/central" className="rounded-xl border border-[#44344b] bg-[#211a28] p-5 text-sm hover:border-[#916faf]">Abrir Central de Operações <ArrowUpRight className="ml-1 inline" size={16}/><div className="mt-2 text-xs text-[#a396ad]">Manutenção, comunicados, mensagens e métricas.</div></a><a href="/panel" className="rounded-xl border border-[#44344b] bg-[#211a28] p-5 text-sm hover:border-[#916faf]">Abrir módulos originais <ArrowUpRight className="ml-1 inline" size={16}/><div className="mt-2 text-xs text-[#a396ad]">Preserva as ferramentas e categorias já existentes.</div></a></div>
  </section>
 </main></div></div></div>;
}