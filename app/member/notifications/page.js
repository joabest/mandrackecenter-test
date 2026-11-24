'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Bell,Check,RefreshCw} from 'lucide-react';
export default function Inbox(){
 const [notifications,setNotifications]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function reload(){try{const r=await fetch('/api/member/notifications',{cache:'no-store',signal:AbortSignal.timeout(12000)}),d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao carregar');setNotifications(d.notifications||[]);setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{reload()},[]);
 async function mark(id){setBusy(true);try{const r=await fetch('/api/member/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}),d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao atualizar');await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <main className="min-h-screen bg-[#0e0e11] px-4 py-8 text-[#f0edf4] sm:px-8"><div className="mx-auto max-w-4xl">
 <Link href="/member" className="mb-7 inline-flex items-center gap-2 text-sm text-[#c9a9e7]"><ArrowLeft size={16}/> Minha conta</Link><div className="mb-7 flex items-center justify-between"><div><h1 className="flex items-center gap-3 text-2xl font-semibold"><Bell size={22}/> Notificações</h1><p className="mt-2 text-sm text-[#aba1b4]">Seus avisos e comunicados da administração.</p></div><button onClick={reload} aria-label="Atualizar" className="rounded-lg border border-[#554264] p-3"><RefreshCw size={17}/></button></div>
 {error&&<p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}
 <div className="space-y-3">{notifications.map(x=><article key={x.id} className={'rounded-xl border p-5 '+(x.read_at?'border-[#33293b] bg-[#19171d]':'border-[#795494] bg-[#241b2c]')}><div className="flex justify-between gap-3"><div><h2 className="font-semibold">{x.title}</h2><p className="mt-1 text-xs text-[#aba1b4]">{new Date(x.created_at).toLocaleString('pt-BR')}</p></div>{!x.read_at&&<button disabled={busy} onClick={()=>mark(x.id)} className="flex h-fit items-center gap-1 rounded-lg border border-[#77568c] px-3 py-2 text-xs"><Check size={14}/> Marcar lida</button>}</div><p className="mt-4 whitespace-pre-wrap text-sm text-[#d8cfe0]">{x.message}</p></article>)}{!notifications.length&&<p className="text-sm text-[#aaa0ae]">Nenhuma notificação.</p>}</div>
 </div></main>;
}