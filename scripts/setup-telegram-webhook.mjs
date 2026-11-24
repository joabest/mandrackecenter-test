// Execute localmente com variáveis TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, SITE_URL.
// Exemplo: SITE_URL=https://painel-beige-tau.vercel.app node scripts/setup-telegram-webhook.mjs
const token=process.env.TELEGRAM_BOT_TOKEN;
const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
const site=process.env.SITE_URL;
if(!token||!secret||secret.length<16||!site||!/^https:\/\//.test(site)){
 console.error('Defina TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET (16+ chars) e SITE_URL (HTTPS).');
 process.exitCode=1;
}else{
 const url=new URL('/api/telegram/webhook',site).toString();
 const res=await fetch('https://api.telegram.org/bot'+token+'/setWebhook',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({url,secret_token:secret,allowed_updates:['message'],drop_pending_updates:false})
 });
 const data=await res.json();
 console.log(data.ok?'Webhook registrado: '+url:'Erro ao registrar webhook: '+String(data.description||res.status));
 if(!data.ok)process.exitCode=1;
}
