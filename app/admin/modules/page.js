'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ShieldCheck,Power,PowerOff,Save,Eye,RefreshCw,X,Settings2,Search} from 'lucide-react';
export default function ModuleManager(){
 const [items,setItems]=useState([]),[saving,setSaving]=useState(''),[error,setError]=useState(''),[selected,setSelected]=useState(null),[preview,setPreview]=useState(null),[filter,setFilter]=useState('');
 async function load(){
  try{const r=await fetch('/api/admin/modules',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Falha');setItems(d.modules||[]);setError('')}catch(e){setError(e.message)}
 }
 useEffect(()=>{load()},[]);
 const groups=[...new Set(items.map(x=>x.group))];
 async function save(item){
  setSaving(item.id);try{
   const r=await fetch('/api/admin/modules',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({module_id:item.id,enabled:item.enabled,off_message:item.off_message})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Erro ao salvar');
   await load();setSelected(null);
  }catch(e){setError(e.message)}finally{setSaving('')}
 }
 const change=(id,patch)=>setItems(a=>a.map(m=>m.id===id?{...m,...patch}:m));
 const update=x=>{setSelected(x.id);setError('')};
 const filtered=items.filter(m=>(m.name+' '+m.id+' '+m.group).toLowerCase().includes(filter.toLowerCase()));
 return <main className="min-h-screen bg-[#0d0b12] p-5 text-[#f1eafb] md:p-9">
  <div className="mx-auto max-w-6xl">
   <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
    <div><div className="mb-2 text-[11px] font-semibold uppercase tracking-[.2em] text-[#b28dd5]">MANDRACKE CENTER · ADMIN</div><h1 className="text-3xl font-semibold">Gerenciar módulos</h1><p className="mt-2 text-sm text-[#aca2b7]">Ative, desative ou altere o aviso de cada ferramenta sem removê-la.</p></div>
    <div className="flex gap-2"><a href="/admin/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-[#624a75] px-4 py-3 text-xs text-[#e4d0f8]"><ArrowLeft size={15}/> Dashboard</a><button onClick={load} title="Atualizar" className="!bg-[#392a45] !p-3"><RefreshCw size={16}/></button></div>
   </div>
   <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
    {[[items.length,'Módulos cadastrados'],[items.filter(m=>m.enabled).length,'Disponíveis'],[items.filter(m=>!m.enabled).length,'Status OFF']].map(([v,n])=><div key={n} className="rounded-2xl border border-[#3c3049] bg-[#19151f] p-5"><div className="text-3xl font-semibold">{v}</div><p className="mt-2 text-xs text-[#aaa0b4]">{n}</p></div>)}
   </section>
   {error&&<div role="alert" className="mb-4 rounded-xl border border-rose-900 bg-rose-950/40 p-4 text-sm">{error}</div>}
   <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#51405e] bg-[#211926] px-4"><Search size={17} className="text-[#a88bc0]"/><input className="w-full !bg-transparent !py-3 text-sm text-white outline-none" placeholder="Buscar módulo..." value={filter} onChange={e=>setFilter(e.target.value)}/></div>
   {groups.map(group=>{
    const rows=filtered.filter(m=>m.group===group);if(!rows.length)return null;
    return <section key={group} className="mb-7"><h2 className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-[#a98bc2]">{group}</h2>
     <div className="overflow-hidden rounded-2xl border border-[#372b40] bg-[#17131c]">
      {rows.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2d2635] p-4 last:border-0 sm:px-6">
       <div><div className="flex items-center gap-2 text-sm font-semibold">{m.name}<span className={'rounded-md px-2 py-1 text-[10px] '+(m.enabled?'bg-emerald-900/30 text-emerald-300':'bg-rose-950/60 text-rose-300')}>{m.enabled?'ON':'OFF'}</span></div><div className="mt-1 text-[11px] text-[#91879b]">ID: {m.id}</div></div>
       <div className="flex flex-wrap gap-2"><button onClick={()=>setPreview(m)} className="inline-flex items-center gap-2 !border !border-[#51415b] !bg-[#261f2e] !px-3 !py-2 !text-xs"><Eye size={14}/> Prévia</button><button onClick={()=>update(m)} className="inline-flex items-center gap-2 !bg-[#4a325c] !px-3 !py-2 !text-xs"><Settings2 size={14}/> Editar status</button></div>
      </div>)}
     </div>
    </section>
   })}
   <p className="mt-8 text-xs leading-6 text-[#958b9f]">O controle OFF bloqueia a abertura do módulo na interface existente. Rotas de API próprias de cada ferramenta devem validar o mesmo status no servidor antes de executar suas operações.</p>
  </div>
  {(selected||preview)&&<div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4" onClick={()=>{setSelected(null);setPreview(null)}}>
   <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[22px] border border-[#684b80] bg-[#191321] p-6 shadow-[0_24px_85px_#000a]" onClick={e=>e.stopPropagation()}>
    <div className="mb-5 flex items-center justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl border border-[#634a75] bg-[#30213c] text-[#c39bdf]">{preview?<PowerOff size={22}/>:<Settings2 size={22}/>}</div><button aria-label="Fechar" onClick={()=>{setPreview(null);setSelected(null)}} className="!bg-transparent !p-1"><X size={19}/></button></div>
    {preview?<>
     <div className="mb-2 text-[11px] font-bold tracking-[.16em] text-[#bf97df]">MANDRACKE CENTER</div><h2 className="text-2xl font-semibold">{preview.name} — OFF</h2>
     <p className="mt-4 text-sm leading-6 text-[#bdafc8]">{preview.off_message}</p>
     <button onClick={()=>setPreview(null)} className="mt-6 w-full !bg-[#61417c]">Entendido</button>
    </>:(()=>{
     const m=items.find(x=>x.id===selected);if(!m)return null;
     return <><h2 className="text-2xl font-semibold">{m.name}</h2><p className="mb-5 mt-2 text-sm text-[#a89aad]">Altere o status e salve no servidor. O aviso será exibido quando o módulo estiver OFF.</p>
      <label className="mb-4 flex items-center justify-between rounded-xl border border-[#45334d] bg-[#261b2d] p-4 text-sm">Status do módulo <select aria-label="Status" className="rounded-lg bg-[#33223f] p-2" value={m.enabled?'on':'off'} onChange={e=>change(m.id,{enabled:e.target.value==='on'})}><option value="on">ON — Ativo</option><option value="off">OFF — Indisponível</option></select></label>
      <label htmlFor="off-message" className="text-xs font-medium text-[#c0aed0]">Mensagem do modal OFF</label><textarea id="off-message" rows={4} maxLength={280} className="mt-2 w-full resize-none rounded-xl border border-[#5d466e] bg-[#110e16] p-3 text-sm text-white" value={m.off_message} onChange={e=>change(m.id,{off_message:e.target.value})}/>
      <div className="mt-5 flex justify-end gap-2"><button className="!bg-[#302735]" onClick={()=>setSelected(null)}>Cancelar</button><button disabled={saving===m.id} onClick={()=>save(m)} className="inline-flex items-center gap-2 !bg-[#6f4892]"><Save size={16}/>{saving===m.id?'Salvando...':'Salvar alterações'}</button></div>
     </>})()}
   </div>
  </div>}
 </main>;
}