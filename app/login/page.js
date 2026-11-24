'use client';
import {useEffect,useState} from 'react';
export default function Login(){
 const [pwd,setPwd]=useState(''),[key,setKey]=useState(''),[mode,setMode]=useState('telegram');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[config,setConfig]=useState({});
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('admin')==='1')setMode('admin');fetch('/api/public-config').then(r=>r.json()).then(setConfig).catch(()=>{})},[]);
 async function submit(e){
  e.preventDefault();setBusy(true);setError('');
  try{
   const r=await fetch(mode==='admin'?'/api/login':'/api/member/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(mode==='admin'?{password:pwd}:{key:key.trim()})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Falha de autenticação');
   location.replace(d.redirect||(mode==='admin'?'/admin/dashboard':'/member'));
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="auth"><div className="login"><div className="logo">⬡ <span>MANDRACKE <b>CENTER</b></span></div><div className="eyebrow" style={{marginTop:38}}>ACESSO PROTEGIDO</div><h1>{mode==='admin'?'Administração':'Entrar com Telegram'}</h1>
 <div className="login-tabs"><button type="button" className={mode==='telegram'?'on':''} onClick={()=>{setMode('telegram');setError('')}}>Key do Telegram</button><button type="button" className={mode==='admin'?'on':''} onClick={()=>{setMode('admin');setError('')}}>Administrador</button></div>
 {mode==='telegram'?<>
 <p>Abra o bot vinculado à sua conta Telegram, envie <b>/start</b> e copie a key permanente que ele fornecer.</p>
 {config.bot?<a className="botlink" href={'https://t.me/'+config.bot+'?start=login'} target="_blank" rel="noopener noreferrer">Abrir bot @{config.bot} ↗</a>:<p className="error">Bot ainda não configurado pelo administrador.</p>}
 <form onSubmit={submit}><label htmlFor="key">KEY DE ACESSO</label><input id="key" type="text" required autoComplete="off" spellCheck="false" value={key} onChange={e=>setKey(e.target.value)} placeholder="Cole a key recebida no Telegram"/><button disabled={busy}>{busy?'Validando key...':'Entrar na minha conta →'}</button></form>
 </>:<>
 <p>Entre com a senha de administrador para gerenciar o painel.</p>
 <form onSubmit={submit}><label htmlFor="password">SENHA ADMINISTRATIVA</label><input id="password" type="password" autoComplete="current-password" required value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Digite a senha"/><button disabled={busy}>{busy?'Validando...':'Entrar no painel →'}</button></form>
 </>}
 {error&&<div role="alert" className="error">{error}</div>}
 <div style={{display:'flex',justifyContent:'space-between',gap:12,marginTop:22}}><a href="https://t.me/mandracke" target="_blank" rel="noopener noreferrer" style={{color:'#bc9ff1'}}>Suporte</a>{config.group&&<a href={config.group} target="_blank" rel="noopener noreferrer" style={{color:'#bc9ff1'}}>Grupo da central</a>}</div>
 <small style={{display:'block',marginTop:16}}>Sua key permanece válida até ser substituída ou revogada. Nunca a compartilhe. O saldo é consultado no servidor.</small>
 </div></main>
}
