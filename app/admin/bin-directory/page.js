'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Search, Landmark, CreditCard, Filter, ArrowLeft} from 'lucide-react';

const normalize=value=>String(value||'').trim();
export default function BinDirectory(){
 const [bin,setBin]=useState('');
 const [records,setRecords]=useState([]);
 const [selected,setSelected]=useState(null);
 const [checking,setChecking]=useState('');
 const [scheme,setScheme]=useState('');
 const [bank,setBank]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const schemes=useMemo(()=>[...new Set(records.map(x=>x.scheme).filter(Boolean))].sort(),[records]);
 const banks=useMemo(()=>[...new Set(records.map(x=>x.bank).filter(Boolean))].sort(),[records]);
 const filtered=useMemo(()=>records.filter(x=>(!scheme||x.scheme===scheme)&&(!bank||x.bank===bank)),[records,scheme,bank]);
 async function verify(value){
  setError('');setChecking(value);
  try{const response=await fetch('/api/bin?bin='+encodeURIComponent(value),{cache:'no-store',signal:AbortSignal.timeout(12000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Consulta indisponível');setSelected(data);setRecords(previous=>[data,...previous.filter(item=>item.bin!==data.bin)]);}catch(e){setError(e.message||'Falha na consulta');}finally{setChecking('');}
 }
 async function lookup(e){
  e.preventDefault();setError('');
  const value=normalize(bin);
  if(!/^\d{6,8}$/.test(value)){setError('Informe um BIN com 6 a 8 dígitos.');return;}
  setBusy(true);
  try{
   const response=await fetch('/api/bin?bin='+encodeURIComponent(value),{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Falha na consulta.');
   setRecords(previous=>[data,...previous.filter(item=>item.bin!==data.bin)]);
   setSelected(data);
   setBin('');
  }catch(err){setError(err.message||'Não foi possível consultar o BIN.');}
  finally{setBusy(false);}
 }
 return <main className="min-h-screen bg-[#0e0e11] px-4 py-8 text-[#f0edf4] sm:px-8">
  <div className="mx-auto max-w-6xl">
   <Link href="/admin/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-[#baa3d0] hover:text-white"><ArrowLeft size={16}/> Voltar ao painel</Link>
   <div className="mb-7 flex items-center gap-3"><div className="rounded-xl bg-[#30223e] p-3 text-[#cba8ef]"><CreditCard size={22}/></div><div><h1 className="text-2xl font-semibold">Diretório de BINs</h1><p className="text-sm text-[#aaa0ae]">Consulta administrativa de metadados públicos de emissores</p></div></div>
   <form onSubmit={lookup} className="flex flex-wrap gap-3 rounded-2xl border border-[#3d3046] bg-[#1b1820] p-5">
    <label className="flex-1 text-sm text-[#b7a9be]">Pesquisar por BIN (6 a 8 dígitos)
     <input value={bin} onChange={e=>setBin(e.target.value.replace(/\D/g,'').slice(0,8))} inputMode="numeric" autoComplete="off" placeholder="Digite um BIN" className="mt-2 block w-full rounded-lg border border-[#51435c] bg-[#100f13] px-4 py-3 text-white outline-none focus:border-[#bd95e7]"/>
    </label>
    <button disabled={busy} className="self-end inline-flex items-center gap-2 rounded-lg bg-[#76509c] px-5 py-3 font-semibold text-white disabled:opacity-50"><Search size={17}/>{busy?'Consultando...':'Consultar'}</button>
   </form>
   {error&&<p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
   {selected&&<section className="mt-6 grid gap-5 rounded-2xl border border-[#3d3046] bg-[#1b1820] p-5 md:grid-cols-2"><div className="flex aspect-[1.6] flex-col justify-between rounded-2xl border border-violet-400/30 bg-gradient-to-br from-[#291537] via-[#593377] to-[#11101b] p-6 shadow-xl"><div className="flex justify-between text-sm font-semibold"><span>MANDRACKE CENTER</span><span className="uppercase italic">{selected.scheme||'BANDEIRA'}</span></div><div className="font-mono text-2xl tracking-widest">{selected.bin} •••• ••••</div><div className="truncate text-xs uppercase">{selected.bank||'Emissor não informado'}</div></div><div className="space-y-3 text-sm"><h2 className="text-lg font-semibold">Identificação do BIN</h2>{[['Bandeira',selected.scheme],['Banco',selected.bank],['Tipo',selected.type],['País',selected.country]].map(([name,value])=><div key={name} className="flex justify-between gap-3 border-b border-[#372d40] pb-2"><span className="text-[#a99bad]">{name}</span><span className="text-right">{value||'Não informado'}</span></div>)}<p className="text-xs text-[#aaa0ae]">Cartão visual demonstrativo; não contém número completo, CVV ou validação de autenticação.</p></div></section>}
   <div className="mt-6 rounded-2xl border border-[#3d3046] bg-[#1b1820] p-5">
    <div className="mb-4 flex items-center gap-2 text-[#cba8ef]"><Filter size={18}/><h2 className="font-semibold">Filtros</h2></div>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-xs text-[#b7a9be]">Bandeira<select value={scheme} onChange={e=>setScheme(e.target.value)} className="mt-2 block w-full rounded-lg border border-[#51435c] bg-[#100f13] p-3 text-sm text-white"><option value="">Todas</option>{schemes.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label className="text-xs text-[#b7a9be]">Banco emissor<select value={bank} onChange={e=>setBank(e.target.value)} className="mt-2 block w-full rounded-lg border border-[#51435c] bg-[#100f13] p-3 text-sm text-white"><option value="">Todos</option>{banks.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    </div>
   </div>
   <div className="mt-6 overflow-x-auto rounded-2xl border border-[#3d3046] bg-[#1b1820]">
    <div className="border-b border-[#3d3046] p-5"><h2 className="flex items-center gap-2 font-semibold"><Landmark size={18}/> Resultados ({filtered.length})</h2><p className="mt-1 text-xs text-[#aaa0ae]">Resultados consultados nesta sessão. Informações podem estar incompletas ou desatualizadas.</p></div>
    <table className="w-full min-w-[700px] text-left text-sm"><thead className="text-[#b7a9be]"><tr>{['BIN','Bandeira','Banco emissor','Tipo','País','Ação'].map(x=><th className="p-4 font-medium" key={x}>{x}</th>)}</tr></thead><tbody>{filtered.map(x=><tr key={x.bin} className="border-t border-[#372d40]"><td className="p-4 font-mono">{x.bin}</td><td className="p-4">{x.scheme}</td><td className="p-4">{x.bank}</td><td className="p-4">{x.type}</td><td className="p-4">{x.country}</td><td className="p-4"><button disabled={checking===x.bin} onClick={()=>verify(x.bin)} className="rounded-lg bg-[#694a89] px-3 py-2 text-xs text-white disabled:opacity-50">{checking===x.bin?'Consultando...':'Verificar'}</button></td></tr>)}</tbody></table>
    {!filtered.length&&<p className="p-8 text-center text-sm text-[#aaa0ae]">Nenhuma consulta corresponde aos filtros.</p>}
   </div>
  </div>
 </main>;
}
