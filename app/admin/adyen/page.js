'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,PowerOff,Power,Save,Eye,RefreshCw,X,Settings2,Search} from 'lucide-react';

export default function AdyenChecker(){
  const [items,setItems]=useState([]),[saving,setSaving]=useState(''),[error,setError]=useState(''),[selected,setSelected]=useState(null),[preview,setPreview]=useState(null),[filter,setFilter]=useState('');
  const [sessions,setSessions]=useState([]),[session,setSession]=useState(null),[mode,setMode]=useState('TEST'); // TEST|LIVE
  async function load(){
    try{
      const r=await fetch('/api/admin/adyen/sessions',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Falha');setItems(d.sessions||[]);setError('')
    }catch(e){setError(e.message)}
  }
  useEffect(()=>{load()},[]);
  async function createSession(){
    setSaving('creating');try{
      const r=await fetch('/api/admin/adyen/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:mode})});
      const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao criar sessão');setSession(d.session||null);await load();setSaving('')
    }catch(e){setError(e.message);setSaving('')}
  }
  const change=(id,patch)=>setItems(a=>a.map(m=>m.id===id?{...m,...patch}:m));
  const update=x=>{setSelected(x.id);setError('')};
  const filtered=items.filter(m=>(m.name+' '+m.id+' '+m.group).toLowerCase().includes(filter.toLowerCase()));
  return <main className="min-h-screen bg-[#0d0b12] p-5 text-[#f1eafb] md:p-9">
    <div className="mx-auto max-w-6xl">
     <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div><div className="mb-2 text-[11px] font-semibold uppercase tracking-[.2em] text-[#b28dd5]">MANDRACKE CENTER · ADMIN</div><h1 className="text-3xl font-semibold">Check Adyen</h1><p className="mt-2 text-sm text-[#aca2b7]">Módulo de verificação de transações com Adyen · mododo {mode}</p></div>
      <div className="flex gap-2">
        <a href="/admin/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-[#624a75] px-4 py-3 text-xs text-[#e4d0f8]"><ArrowLeft size={15}/> Dashboard</a>
        <button onClick={load} title="Atualizar" className="!bg-[#392a45] !p-3"><RefreshCw size={16}/></button>
        <select className="rounded-xl bg-[#33223f] p-2 border border-[#51405e] text-white select-none"
          value={mode} onChange={e=>setMode(e.target.value)}>
          <option value="TEST">Modo TEST (cartões de teste Adyen)</option>
          <option value="LIVE">Modo LIVE (transações reais)</option>
        </select>
      </div>
     </div>
     <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[[items.length,'Sessões cadastradas'],[items.filter(s=>s.active).length,'Ativas'],[items.filter(s=>!s.active).length,'Inativas']].map(([v,n])=><div key={n} className="rounded-2xl border border-[#3c3049] bg-[#19151f] p-5"><div className="text-3xl font-semibold">{v}</div><p className="mt-2 text-xs text-[#aaa0b4]">{n}</p></div>)}
     </section>
     {error&&<div role="alert" className="mb-4 rounded-xl border border-rose-900 bg-rose-950/40 p-4 text-sm">{error}</div>}
     <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#51405e] bg-[#211926] px-4">
      <Search size={17} className="text-[#a88bc0]"/><input className="w-full !bg-transparent !py-3 text-sm text-white outline-none" placeholder="Buscar sessão..." value={filter} onChange={e=>setFilter(e.target.value)}/>
     </div>
     <div className="mb-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(s=>(
        <div key={s.id} className="rounded-2xl border border-[#372b40] bg-[#17131c] p-4">
         <div className="flex items-center justify-between text-sm font-semibold">
          <span>{s.name||'Sessão #' + s.id}</span>
          <span className={s.active?'bg-emerald-900/30 text-emerald-300':'bg-rose-950/60 text-rose-300'}>{s.active?'ATIVA':'INATIVA'}</span>
         </div>
         <div className="mt-2 text-[11px] text-[#91879b]">Modo: {mode} · Referência: {s.reference||'—'}</div>
         <div className="mt-3">
          <button onClick={()=>setPreview(s)} className="inline-flex items-center gap-2 !border !border-[#51415b] !bg-[#261f2e] !px-3 !py-2 !text-xs"><Eye size={14}/> Prévia</button>
          <button onClick={()=>update(s)} className="inline-flex items-center gap-2 !bg-[#4a325c] !px-3 !py-2 !text-xs"><Settings2 size={14}/> Detalhes</button>
         </div>
        </div>
      ))}
     </div>
    </div>
   {(selected||preview)&&<div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4" onClick={()=>{setSelected(null);setPreview(null)}}>
    <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[22px] border border-[#684b80] bg-[#191321] p-6 shadow-[0_24px_85px_#000a]" onClick={e=>e.stopPropagation()}>
     <div className="mb-5 flex items-center justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl border border-[#634a75] bg-[#30213c] text-[#c39bdf]">{preview?<PowerOff size={22}/>:<Settings2 size={22}/>}</div><button aria-label="Fechar" onClick={()=>{setPreview(null);setSelected(null)}} className="!bg-transparent !p-1"><X size={19}/></button></div>
     {preview?<>
      <div className="mb-2 text-[11px] font-bold tracking-[.16em] text-[#bf97df]">MANDRACKE CENTER</div><h2 className="text-2xl font-semibold">{preview.name} — {mode}</h2>
      <p className="mt-4 text-sm leading-6 text-[#bdafc8]">Referência: {preview.reference||'—'}</p>
      <p className="mt-2 text-sm leading-6 text-[#bdafc8]">Ambiente: {mode}</p>
      {preview.environment&&<p className="mt-2 text-sm leading-6 text-[#bdafc8]">Ambiente Adyen: {preview.environment}</p>}
      {preview.merchantAccount&&<p className="mt-2 text-sm leading-6 text-[#bdafc8]">Merchant Account: {preview.merchantAccount}</p>}
      {preview.createdAt&&<p className="mt-2 text-sm leading-6 text-[#bdafc8]">Criado em: {new Date(preview.createdAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p>}
      {preview.expiry&&<p className="mt-2 text-sm leading-6 text-[#bdafc8]">Expira em: {new Date(preview.expiry).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p>}
      <button onClick={()=>setPreview(null)} className="mt-6 w-full !bg-[#61417c]">Entendido</button>
     </>:<>
      const m=items.find(x=>x.id===selected);if(!m)return null;
      return <><h2 className="text-2xl font-semibold">{m.name}</h2><p className="mb-5 mt-2 text-sm text-[#a89aad]">Sessão de verificação Adyen.</p>
       <label className="mb-4 flex items-center justify-between rounded-xl border border-[#45334d] bg-[#261b2d] p-4 text-sm">Status do módulo <select aria-label="Status" className="rounded-lg bg-[#33223f] p-2" value={m.enabled?'on':'off'} onChange={e=>change(m.id,{enabled:e.target.value==='on'})}><option value="on">ON — Ativo</option><option value="off">OFF — Indisponível</option></select></label>
       <label htmlFor="off-message" className="text-xs font-medium text-[#c0aed0]">Mensagem do modal OFF</label><textarea id="off-message" rows={4} maxLength={280} className="mt-2 w-full resize-none rounded-xl border border-[#5d466e] bg-[#110e16] p-3 text-sm text-white" value={m.off_message} onChange={e=>change(m.id,{off_message:e.target.value})}/>
       <div className="mt-5 flex justify-end gap-2"><button className="!bg-[#302735]" onClick={()=>setSelected(null)}>Cancelar</button><button disabled={saving===m.id} onClick={()=>save(m)} className="inline-flex items-center gap-2 !bg-[#6f4892]"><Save size={16}/>{saving===m.id?'Salvando...':'Salvar alterações'}</button></div>
      </>}
    </div>
   </div>}
  </main>;
}


