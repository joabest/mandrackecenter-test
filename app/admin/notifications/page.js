'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Bell,Send,RefreshCw,Users} from 'lucide-react';
export default function AdminNotifications(){
 const [form,setForm]=useState({target:'all',telegram_id:'',threshold:'10',title:'',message:''});
 const [history,setHistory]=useState([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function fetchData(){try{const r=await fetch('/api/admin/notifications',{cache:'no-store',signal:AbortSignal.timeout(12000)}),d=await r.json();if(!r.ok)throw Error(d.error||'Falha na consulta');setHistory(d.notifications||[]);setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{fetchData()},[]);
 async function submit(e){
  e.preventDefault();if(!confirm('Enviar esta notificação para os destinatários selecionados?'))return;
  setBusy(true);setMessage('');setError('');
  try{const r=await fetch('/api/admin/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)}),d=await r.json();if(!r.ok)throw Error(d.error||'Falha no envio');setMessage('Notificação registrada para '+d.recipients+' usuário(s).');setForm(p=>({...p,title:'',message:''}));await fetchData()}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[#0e0e11] px-4 py-8 text-[#f0edf4] sm:px-8"><div className="mx-auto max-w-5xl">
 <Link href="/admin/dashboard" className="mb-7 inline-flex items-center gap-2 text-sm text-[#c6a5df]"><ArrowLeft size={16}/> Voltar ao painel</Link>
 <div className="mb-7 flex items-center gap-3"><div className="rounded-xl bg-[#342640] p-3 text-[#cea9ea]"><Bell size={25}/></div><div><h1 className="text-3xl font-semibold">Central de notificações</h1><p className="text-sm text-[#aba2b2]">Avisos internos para clientes e alertas de saldo baixo.</p></div></div>
 {error&&<p role="alert" className="mb-4 rounded-xl border border-rose-900 p-4 text-rose-300">{error}</p>}
 {message&&<p role="status" className="mb-4 rounded-xl border border-[#655078] p-4 text-[#dac2ec]">{message}</p>}
 <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[#3e3346] bg-[#1b1820] p-6">
  <h2 className="flex items-center gap-2 font-semibold"><Send size={18}/> Nova notificação</h2>
  <label className="block text-sm text-[#b3a8bd]">Destinatários<select className="mt-2 block w-full rounded-lg border border-[#554361] bg-[#100f13] p-3 text-white" value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))}><option value="all">Todos os clientes que recebem avisos</option><option value="user">Cliente específico</option><option value="low_balance">Clientes com saldo baixo</option></select></label>
  {form.target==='user'&&<label className="block text-sm text-[#b3a8bd]">Telegram ID do cliente<input required inputMode="numeric" value={form.telegram_id} onChange={e=>setForm(p=>({...p,telegram_id:e.target.value.replace(/\D/g,'')}))} className="mt-2 block w-full rounded-lg border border-[#554361] bg-[#100f13] p-3 text-white"/></label>}
  {form.target==='low_balance'&&<label className="block text-sm text-[#b3a8bd]">Notificar saldos iguais ou menores que<input type="number" min="0" max="100000" required value={form.threshold} onChange={e=>setForm(p=>({...p,threshold:e.target.value}))} className="mt-2 block w-full rounded-lg border border-[#554361] bg-[#100f13] p-3 text-white"/></label>}
  <label className="block text-sm text-[#b3a8bd]">Título<input required maxLength={100} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} className="mt-2 block w-full rounded-lg border border-[#554361] bg-[#100f13] p-3 text-white"/></label>
  <label className="block text-sm text-[#b3a8bd]">Mensagem<textarea required maxLength={1000} rows={4} value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} className="mt-2 block w-full rounded-lg border border-[#554361] bg-[#100f13] p-3 text-white"/></label>
  <button disabled={busy} className="flex items-center gap-2 rounded-xl bg-[#725090] px-5 py-3 text-sm font-semibold disabled:opacity-50"><Send size={17}/>{busy?'Enviando...':'Enviar notificação'}</button>
 </form>
 <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-semibold"><Users size={19}/> Histórico recente</h2><button onClick={fetchData} aria-label="Atualizar" className="rounded-lg border border-[#5a4968] p-2"><RefreshCw size={17}/></button></div><div className="space-y-3">{history.map(x=><article key={x.id} className="rounded-xl border border-[#3e3346] bg-[#1b1820] p-5"><div className="font-semibold">{x.title}</div><div className="mt-1 text-xs text-[#aa9daf]">Cliente {x.telegram_id} · {new Date(x.created_at).toLocaleString('pt-BR')}</div><p className="mt-3 whitespace-pre-wrap text-sm text-[#d8cfde]">{x.message}</p></article>)}{!history.length&&<p className="text-sm text-[#aaa0ae]">Nenhum aviso enviado.</p>}</div></section>
 </div></main>
}