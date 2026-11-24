'use client';
import {useState} from 'react';
import Script from 'next/script';
export default function TelegramEntry(){
 const [status,setStatus]=useState('Conectando sua conta do Telegram...'),[ready,setReady]=useState(false);
 async function login(){
  if(ready)return;
  const sdk=window.Telegram?.WebApp,initData=sdk?.initData;
  if(!initData){setStatus('Abra esta página pelo botão Abrir Site do bot @mandrackecenterkeybot. O navegador comum não fornece sua autenticação Telegram.');return}
  setReady(true);
  try{
   sdk.ready();sdk.expand();
   const r=await fetch('/api/member/telegram-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData}),cache:'no-store'});
   const out=await r.json();
   if(!r.ok)throw Error(out.error||'Falha no acesso');
   location.replace(out.redirect||'/member');
  }catch(e){setStatus(e.message);setReady(false)}
 }
 return <main className="auth"><Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onLoad={login}/>
 <div className="login"><div className="logo">⬡ <span>MANDRACKE <b>CENTER</b></span></div>
 <div className="eyebrow" style={{marginTop:30}}>ACESSO PELO TELEGRAM</div><h1>Minha Conta</h1><p role="status">{status}</p>
 <button type="button" onClick={login} disabled={ready}>{ready?'Autenticando...':'Conectar minha conta'}</button>
 <p style={{marginTop:16}}>Sua identidade é validada pelo Telegram. Nenhuma key é enviada no link nem exibida no navegador.</p>
 <a href="https://t.me/mandrackecenterkeybot" style={{color:'#c9a4ff'}}>Abrir bot MANDRACKE CENTER</a>
 </div></main>
}
