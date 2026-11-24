'use client';
import {useCallback,useEffect,useState} from 'react';
const api=async(path,method='GET',body)=>{
 const response=await fetch(path,{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const out=await response.json();if(!response.ok)throw Error(out.error||'Erro no servidor');return out;
};
function Count({title,value,detail}){return <div className="central-box"><div className="central-muted">{title}</div><strong className="central-number">{value}</strong>{detail&&<div className="central-muted">{detail}</div>}</div>}
export default function Central(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[text,setText]=useState(''),[status,setStatus]=useState(''),[message,setMessage]=useState('Estamos realizando uma manutenção programada. Voltaremos em breve.');
 const refresh=useCallback(async()=>{try{const x=await api('/api/admin/central');setData(x);if(x.maintenance?.message)setMessage(x.maintenance.message);setError('')}catch(e){setError(e.message)}},[]);
 useEffect(()=>{refresh()},[refresh]);
 async function changeMaintenance(enabled){if(!confirm((enabled?'Ativar':'Desativar')+' manutenção para os visitantes?'))return;setBusy(true);try{await api('/api/admin/central','PATCH',{action:'maintenance',enabled,message});setStatus('Manutenção '+(enabled?'ativada':'desativada')+'.');await refresh()}catch(e){setStatus(e.message)}finally{setBusy(false)}}
 async function publish(){if(!text.trim())return;if(!confirm('Criar um aviso para os usuários que aceitaram receber atualizações?'))return;setBusy(true);try{const x=await api('/api/admin/central','POST',{action:'announcement',text});setText('');setStatus('Aviso criado, ID '+x.id+'. Use Enviar lote para disparar.');await refresh()}catch(e){setStatus(e.message)}finally{setBusy(false)}}
 async function dispatch(id){setBusy(true);try{const x=await api('/api/admin/central/dispatch','POST',{id});setStatus('Lote: '+x.sent+' enviados, '+x.failed+' falhas'+(x.remaining?'. Existem destinatários pendentes; envie outro lote.':'. Lote concluído.'));await refresh()}catch(e){setStatus(e.message)}finally{setBusy(false)}}
 return <main className="central-wrap">
 <div className="central-head"><div><div className="eyebrow">ADMINISTRAÇÃO</div><h1>Central de Operações</h1><p>MANDRACKE CENTER · Telegram, manutenção e indicadores.</p></div><a className="central-link" href="/panel">← Painel principal</a></div>
 {error&&<div role="alert" className="central-error">{error}</div>}
 {status&&<div role="status" className="central-info">{status}</div>}
 {!data?<p>Carregando dados...</p>:<>
 <section className="central-counts">
 <Count title="Usuários" value={data.users}/><Count title="FREE" value={data.plans.FREE}/><Count title="PRO (inclui promoção)" value={data.plans.PRO}/><Count title="PREMIUM" value={data.plans.PREMIUM}/><Count title="Recebem atualizações" value={data.optedIn}/><Count title="Recargas pendentes" value={data.pending}/>
 <Count title="Atividades registradas · 24h" value={data.activity24h} detail="Somente eventos autorizados"/><Count title="Eventos recentes disponíveis" value={data.activityTotalSampled} detail="Amostra de até 1.000 eventos"/>
 </section>
 <section className="central-cols">
 <article className="central-box">
 <h2>Manutenção do site</h2><p>Mostra uma tela de manutenção para visitantes, sem alterar o deploy da Vercel. Administradores autenticados continuam com acesso.</p>
 <div className="central-state">Estado atual: <b>{data.maintenance?.enabled?'MANUTENÇÃO ATIVA':'SITE ATIVO'}</b></div>
 <label htmlFor="maintenance">Mensagem informativa</label>
 <textarea id="maintenance" maxLength="350" value={message} onChange={e=>setMessage(e.target.value)} rows={3}/>
 <div className="central-actions"><button disabled={busy} onClick={()=>changeMaintenance(true)}>Ativar manutenção</button><button disabled={busy} onClick={()=>changeMaintenance(false)}>Reabrir site</button></div>
 <p className="central-muted">Acesso emergencial do admin durante manutenção: /login?admin=1</p>
 </article>
 <article className="central-box"><h2>Avisos por Telegram</h2><p>Envie comunicados para quem iniciou o bot e não cancelou as notificações. Texto sem dados sensíveis.</p>
 <label htmlFor="announcement">Mensagem do aviso</label><textarea id="announcement" rows={5} maxLength="1500" placeholder="Ex.: A central terá manutenção hoje às 22h." value={text} onChange={e=>setText(e.target.value)}/>
 <div className="central-actions"><button disabled={busy||text.trim().length<3} onClick={publish}>Criar aviso</button></div>
 <h3>Últimos avisos</h3>{data.announcements.map(a=><div className="central-entry" key={a.id}><div>{a.message_text}</div><div className="central-actions"><small>#{a.id}</small><button disabled={busy} onClick={()=>dispatch(a.id)}>Enviar próximo lote (20)</button></div></div>)}
 <p className="central-muted">Disparo em lotes de 20. Falhas ficam registradas; não há envio automático em segundo plano.</p>
 </article>
 </section>
 <section className="central-cols">
 <article className="central-box"><h2>Mensagens recebidas</h2><p>Mensagens diretas enviadas ao bot, limitadas a 2.000 caracteres.</p>{data.inbox.length?data.inbox.map(m=><div className="central-entry" key={m.id}><div className="central-muted">Telegram ID {m.telegram_id} · {new Date(m.created_at).toLocaleString('pt-BR')}</div><div style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{m.message_text}</div></div>):<p className="central-muted">Nenhuma mensagem recebida.</p>}</article>
 <article className="central-box"><h2>Planos e ranking</h2><h3>Ranking por saldo de créditos</h3>{data.ranking.map((u,i)=><div className="central-entry" key={u.telegram_id}>{i+1}. @{u.username||u.telegram_id} · {u.plan} · {u.credits} créditos</div>)}
 <h3>Atividade recente por usuário</h3>{data.activityRanking.map((u,i)=><div className="central-entry" key={u.telegram_id}>{i+1}. ID {u.telegram_id} · {u.count} eventos registrados</div>)}
 <h3>Faturamento</h3><p><b>Não disponível</b> — não há dados de pagamentos confirmados.</p><p className="central-muted">{data.revenueNote}</p><p className="central-muted">{data.activityNote}</p>
 </article>
 </section>
 </>}
 </main>
}