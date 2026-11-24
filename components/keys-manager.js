'use client';
import {useEffect,useMemo,useState} from 'react';
import {KeyRound,Trash2,RefreshCw,ArrowLeft,ShieldBan,Search} from 'lucide-react';
export default function KeysManager({admin=false,initialTarget=''}){
 const [keys,setKeys]=useState([]),[selected,setSelected]=useState([]),[filter,setFilter]=useState(''),[target,setTarget]=useState(initialTarget),[blocked,setBlocked]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [mode,setMode]=useState('all');
 async function request(path,options){const r=await fetch(path,{cache:'no-store',...options});const j=await r.json();if(!r.ok)throw Error(j.error||'Falha na solicitação');return j}
 async function load(){setBusy(true);try{const q=admin?(target?'?user='+encodeURIComponent(target):'?scope=all'):'';const result=await request('/api/keys'+q);setKeys(result.keys||[]);setBlocked(Boolean(result.key_generation_blocked));setSelected([]);setError('')}catch(e){setError(e.message)}finally{setBusy(false)}}
 useEffect(()=>{load()},[]);
 const shown=useMemo(()=>keys.filter(k=>[k.telegram_id,k.id].some(v=>String(v).toLowerCase().includes(filter.toLowerCase()))),[keys,filter]);
 const active=shown.filter(k=>!k.revoked_at);
 async function revoke(all=false){
  const ids=selected;
  if(!all&&!ids.length)return;
  const label=all?(admin&&!target?'TODAS AS KEYS DO SISTEMA':target?'todas as keys do usuário '+target:'todas as suas keys'):ids.length+' key(s) selecionadas';
  if(!window.confirm('Destruir '+label+'? A operação é irreversível e encerra sessões antigas.'))return;
  let doubleConfirm;
  if(all&&admin&&!target){
   doubleConfirm=window.prompt('Confirmação dupla: digite DESTRUIR TODAS para continuar');
   if(doubleConfirm!=='DESTRUIR TODAS')return;
  }
  setBusy(true);setNotice('');setError('');
  try{
   const payload={all,ids,scope:admin&&!target?'all':'user',confirm:'DELETE KEY',...(admin&&target?{user:target}:{}),...(doubleConfirm?{doubleConfirm}:{})};
   const result=await request('/api/keys',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   setNotice(result.revoked+' key(s) revogada(s). Para voltar a acessar, gere outra key pelo bot.');
   await load();
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function toggleBlock(){
  if(!admin||!target)return;
  const next=!blocked;
  if(!confirm((next?'Bloquear':'Liberar')+' emissão de keys para '+target+'?'))return;
  setBusy(true);try{await request('/api/keys',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:target,blocked:next})});setBlocked(next);setNotice('Permissão atualizada.')}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[#100e13] px-4 py-8 text-[#f1eaf5] md:px-10">
  <div className="mx-auto max-w-5xl">
   <a className="inline-flex items-center gap-2 text-sm text-[#bea3d0]" href={admin?'/admin/dashboard':'/member'}><ArrowLeft size={16}/> Voltar ao painel</a>
   <div className="mt-8 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><KeyRound className="text-[#c79fe9]"/><h1 className="text-2xl font-bold">Gerenciar Keys</h1></div><p className="mt-3 text-sm text-[#aaa0ae]">Revogue individualmente ou em lote. Uma key destruída não pode ser reutilizada.</p></div><button onClick={load} disabled={busy} className="rounded-xl border border-[#554364] px-4 py-3 text-sm"><RefreshCw size={15} className="mr-2 inline"/>Atualizar</button></div>
   {admin&&<section className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-[#3c3046] bg-[#1b1622] p-4"><label className="flex-1 text-xs text-[#c4b5cb]">Telegram ID (vazio = todas as contas)<input value={target} onChange={e=>setTarget(e.target.value.replace(/\D/g,'').slice(0,20))} placeholder="Filtrar por usuário" className="mt-2 w-full rounded-xl border border-[#594668] bg-[#110e16] px-4 py-3 text-sm text-white"/></label><button onClick={load} disabled={busy} className="rounded-xl bg-[#64477a] px-5 py-3 text-sm">Consultar</button>{target&&<button onClick={toggleBlock} disabled={busy} className="flex items-center gap-2 rounded-xl border border-[#81516a] px-4 py-3 text-sm"><ShieldBan size={16}/>{blocked?'Desbloquear emissão':'Bloquear emissão'}</button>}</section>}
   <section className="mt-6 rounded-2xl border border-[#3a2f42] bg-[#1b1720]">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#342b3c] p-4"><label className="flex items-center gap-2"><input type="checkbox" checked={active.length>0&&active.every(k=>selected.includes(k.id))} onChange={e=>setSelected(e.target.checked?active.map(k=>k.id):[])} /> Selecionar keys ativas visíveis</label><div className="flex items-center gap-2 rounded-xl border border-[#493953] px-3"><Search size={15}/><input className="bg-transparent py-3 text-sm text-white outline-none" placeholder="Buscar ID" value={filter} onChange={e=>setFilter(e.target.value)}/></div></div>
    <div className="divide-y divide-[#302738]">{shown.map(k=><label key={k.id} className="flex items-center gap-4 px-4 py-4 text-sm hover:bg-[#261d2e]"><input type="checkbox" disabled={Boolean(k.revoked_at)||busy} checked={selected.includes(k.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,k.id]:prev.filter(x=>x!==k.id))}/><div className="min-w-0 flex-1"><div className="truncate font-mono text-xs text-[#ddc9ed]">{k.id}</div><div className="mt-1 text-xs text-[#91849b]">Usuário {k.telegram_id} · Criada em {new Date(k.created_at).toLocaleString('pt-BR')}</div></div><span className={'rounded-lg px-3 py-1 text-xs '+(k.revoked_at?'bg-[#39292f] text-[#e7a2b3]':'bg-[#203b32] text-[#a1e6c4]')}>{k.revoked_at?'Revogada':'Ativa'}</span></label>)}
    {!shown.length&&<div className="p-8 text-center text-sm text-[#998ba5]">Nenhuma key encontrada.</div>}</div>
    <div className="flex flex-wrap gap-3 border-t border-[#342b3c] p-4"><button disabled={busy||!selected.length} onClick={()=>revoke(false)} className="flex items-center gap-2 rounded-xl bg-[#87394b] px-4 py-3 text-sm disabled:opacity-40"><Trash2 size={16}/> Destruir {selected.length} selecionada(s)</button><button disabled={busy||!active.length} onClick={()=>revoke(true)} className="rounded-xl border border-[#a94b62] px-4 py-3 text-sm disabled:opacity-40">{admin&&!target?'Destruir todas as keys do sistema':'Destruir todas as minhas keys'+(admin&&target?' do usuário':'')}</button></div>
   </section>
   <p className="mt-4 text-xs text-[#9e91a6]">Para gerar uma nova key, abra o bot @mandrackecenterkeybot e selecione Gerar Key. Nenhuma key revogada é exibida em texto puro.</p>
   {error&&<p role="alert" className="mt-4 rounded-xl border border-red-800 p-4 text-sm text-red-300">{error}</p>}
   {notice&&<p role="status" className="mt-4 rounded-xl border border-emerald-800 p-4 text-sm text-emerald-300">{notice}</p>}
  </div>
 </main>
}