'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ShoppingBag,ArrowLeft,Package,Plus,RefreshCw,Mail,Megaphone,Film,Gamepad2,Globe,KeyRound} from 'lucide-react';
const iconNames=['package','mail','megaphone','film','gamepad','shopping-bag','globe','key-round'];
const formats={package:Package,mail:Mail,megaphone:Megaphone,film:Film,gamepad:Gamepad2,'shopping-bag':ShoppingBag,globe:Globe,'key-round':KeyRound};
const brl=c=>(Number(c||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export default function AdminStore(){
 const [products,setProducts]=useState([]),[orders,setOrders]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [form,setForm]=useState({title:'',category:'',description:'',icon:'package',price:'',stock:'0',active:false});
 async function api(method='GET',body){
  const r=await fetch('/api/admin/store',{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(12000)});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Falha na solicitação');return data;
 }
 async function reload(){try{const data=await api();setProducts(data.products||[]);setOrders(data.orders||[]);setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{reload()},[]);
 async function save(e){e.preventDefault();setBusy(true);try{await api('POST',{...form,price_cents:Math.round(Number(form.price.replace(',','.'))*100),stock:Number(form.stock)});setForm({title:'',category:'',description:'',icon:'package',price:'',stock:'0',active:false});await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function change(body){setBusy(true);try{await api('PATCH',body);await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function finish(order,status){
  if(!confirm('Confirmar atualização deste pedido?'))return;
  const fulfillment_note=status==='paid'?prompt('Informe a entrega autorizada (ex.: código de licença transferível, instrução ou comprovante). Não inclua senhas de contas.'):null;
  if(status==='paid'&&!fulfillment_note?.trim())return;
  await change({id:order.id,action:'order',status,fulfillment_note});
 }
 return <main className="min-h-screen bg-[#0e0e11] px-4 py-8 text-[#f0edf4] sm:px-8"><div className="mx-auto max-w-6xl">
  <Link href="/admin/dashboard" className="mb-7 inline-flex items-center gap-2 text-sm text-[#b995d8]"><ArrowLeft size={16}/> Administração</Link>
  <div className="mb-7 flex items-center justify-between"><div><h1 className="text-3xl font-semibold">Shopping / Store</h1><p className="mt-2 text-sm text-[#a99fb2]">Gerencie catálogo, categorias, estoque e pedidos de produtos digitais autorizados.</p></div><button onClick={reload} aria-label="Atualizar dados" className="rounded-xl border border-[#544063] p-3"><RefreshCw size={19}/></button></div>
  {error&&<p role="alert" className="mb-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-300">{error}</p>}
  <form onSubmit={save} className="grid gap-4 rounded-2xl border border-[#3e3346] bg-[#1b1820] p-6 md:grid-cols-2">
   <h2 className="flex items-center gap-2 text-lg font-semibold md:col-span-2"><Plus size={18}/> Cadastrar produto</h2>
   {[[ 'Nome do produto','title'],['Categoria','category'],['Preço em R$','price'],['Estoque','stock']].map(([title,key])=><label key={key} className="text-xs text-[#afa4b9]">{title}<input required value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} type={key==='stock'?'number':'text'} min={key==='stock'?'0':undefined} className="mt-2 block w-full rounded-lg border border-[#51435c] bg-[#100f13] px-4 py-3 text-sm text-white outline-none focus:border-violet-400"/></label>)}
   <label className="text-xs text-[#afa4b9]">Ícone monocromático<select className="mt-2 block w-full rounded-lg border border-[#51435c] bg-[#100f13] px-4 py-3 text-sm" value={form.icon} onChange={e=>setForm(p=>({...p,icon:e.target.value}))}>{iconNames.map(x=><option value={x} key={x}>{x}</option>)}</select></label>
   <label className="flex items-center gap-3 self-center text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm(p=>({...p,active:e.target.checked}))}/> Publicar na loja</label>
   <label className="text-xs text-[#afa4b9] md:col-span-2">Descrição<textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="mt-2 block min-h-24 w-full rounded-lg border border-[#51435c] bg-[#100f13] px-4 py-3 text-sm text-white"/></label>
   <button disabled={busy} className="rounded-xl bg-[#755096] px-5 py-3 text-sm font-semibold disabled:opacity-60 md:col-span-2">Adicionar produto</button>
  </form>
  <section className="mt-8"><h2 className="mb-4 text-xl font-semibold">Produtos ({products.length})</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{products.map(p=>{const Icon=formats[p.icon]||Package;return <article key={p.id} className="rounded-2xl border border-[#3e3346] bg-[#1b1820] p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#30263a] p-3 text-[#c9a9e7]"><Icon size={21}/></div><div className="min-w-0"><div className="truncate font-semibold">{p.title}</div><div className="text-xs text-[#a99fb2]">{p.category}</div></div></div><div className="my-4 text-lg font-bold">{brl(p.price_cents)}</div><label className="text-xs text-[#afa4b9]">Estoque <input type="number" min="0" defaultValue={p.stock} key={p.id+'-'+p.stock} onBlur={e=>{const v=Number(e.target.value);if(v!==p.stock)change({action:'stock',id:p.id,stock:v})}} className="mt-1 block w-full rounded-lg border border-[#51435c] bg-[#100f13] p-3 text-white"/></label><button onClick={()=>change({action:'visibility',id:p.id,active:!p.active})} className="mt-3 w-full rounded-lg border border-[#705186] bg-[#32233f] p-3 text-xs">{p.active?'Publicado — desativar':'Oculto — publicar'}</button></article>})}</div></section>
  <section className="mt-8"><h2 className="mb-4 text-xl font-semibold">Pedidos ({orders.length})</h2><div className="space-y-3">{orders.map(o=><article key={o.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#3e3346] bg-[#1b1820] p-5"><div><div className="font-medium">#{o.id} · {o.product_title}</div><div className="mt-1 text-xs text-[#afa4b9]">Usuário {o.telegram_id} · {brl(o.price_cents)} · {o.status}</div></div>{o.status==='pending'&&<div className="flex gap-2"><button onClick={()=>finish(o,'paid')} className="rounded-lg bg-[#664881] px-4 py-2 text-xs">Confirmar pagamento e entrega</button><button onClick={()=>finish(o,'canceled')} className="rounded-lg border border-[#56455f] px-4 py-2 text-xs">Cancelar</button></div>}</article>)}</div></section>
 </div></main>;
}