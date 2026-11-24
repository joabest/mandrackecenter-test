'use client';
import {useEffect,useState} from 'react';
export default function BrowserEntry(){
 const [error,setError]=useState(''),[busy,setBusy]=useState(true);
 useEffect(()=>{
  let cancelled=false;
  const params=new URLSearchParams(location.search);
  const ticket=params.get('ticket');
  window.history.replaceState({},'',location.pathname);
  if(!ticket){setBusy(false);setError('Este link não contém autorização. Abra o bot e escolha Abrir Site.');return}
  (async()=>{
   try{
    const res=await fetch('/api/member/browser-ticket',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({ticket})});
    const json=await res.json();
    if(!res.ok)throw Error(json.error||'Não foi possível entrar');
    if(!cancelled)location.replace(json.redirect||'/member');
   }catch(e){if(!cancelled){setError(e.message);setBusy(false)}}
  })();
  return()=>{cancelled=true};
 },[]);
 return <main className="auth"><section className="login">
  <div className="logo">⬡ <span>MANDRACKE <b>CENTER</b></span></div>
  <p className="eyebrow" style={{marginTop:32}}>AUTENTICAÇÃO TELEGRAM</p>
  <h1>{busy?'Conectando...':'Não foi possível entrar'}</h1>
  <p role="status">{busy?'Validando seu link de acesso seguro.':error}</p>
  {!busy&&<a className="botlink" href="https://t.me/mandrackecenterkeybot">Solicitar novo acesso no bot</a>}
  <a style={{display:'block',marginTop:18,color:'#c5a4ff'}} href="/login">Entrar com key manualmente</a>
 </section></main>;
}
