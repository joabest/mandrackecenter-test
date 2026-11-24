const token=process.env.TELEGRAM_BOT_TOKEN;
const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
const url='https://mandracke.vercel.app/api/telegram/webhook';
if(process.env.VERCEL_ENV!=='production'){
 console.log('Telegram webhook: skipped (not production)');
}else if(!token||!secret||secret.length<16){
 console.log('Telegram webhook: missing token or webhook secret');
}else{
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  let resp;
  try{resp=await fetch('https://api.telegram.org/bot'+token+'/setWebhook',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({url,secret_token:secret,allowed_updates:['message','callback_query'],drop_pending_updates:false}),
   signal:controller.signal
  });}finally{clearTimeout(timeout)}
  const result=await resp.json();
  if(!resp.ok||!result.ok)console.warn('Telegram webhook: setup failed; verify token and network');
  else {
   console.log('Telegram webhook: registered for production');
   const commands=[
    {command:'start',description:'Abrir menu principal'},
    {command:'key',description:'Gerar ou substituir key permanente'},
    {command:'conta',description:'Consultar meu plano e conta'},
    {command:'creditos',description:'Consultar saldo de créditos'},
    {command:'status',description:'Consultar status da central'},
    {command:'id',description:'Mostrar meu Telegram ID'},
    {command:'ajuda',description:'Ver ajuda e comandos'},
    {command:'limites',description:'Consultar plano e limites'},
    {command:'historico',description:'Consultar recargas anteriores'},
    {command:'recarga',description:'Solicitar recarga de créditos'},
    {command:'nome',description:'Atualizar nome do painel'},
    {command:'foto',description:'Atualizar foto do painel'},
    {command:'dispositivos',description:'Desconectar sessões do painel'},
    {command:'grupo',description:'Grupo da central'},
    {command:'suporte',description:'Falar com suporte'}
   ];
   try{
    const c=await fetch('https://api.telegram.org/bot'+token+'/setMyCommands',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({commands,scope:{type:'all_private_chats'}}),
     signal:AbortSignal.timeout(8000)
    });
    const result=await c.json();
    console.log(result.ok?'Telegram: commands registered':'Telegram: command registration failed');
    const adminId=process.env.ADMIN_TELEGRAM_ID;
    if(adminId&&/^\d+$/.test(adminId)){
     const adminCommands=[
      ...commands,
      {command:'admin',description:'Abrir administração'},
      {command:'gerenciarcreditos',description:'Gerenciar créditos de usuários'},
      {command:'pendentes',description:'Aprovar recargas pendentes'},
      {command:'manutencao',description:'Controlar manutenção do site'},
      {command:'mensagens',description:'Consultar mensagens recebidas'},
      {command:'avisos',description:'Gerenciar comunicados'},
      {command:'avisar',description:'Criar um comunicado'},
      {command:'responder',description:'Responder usuário pelo Telegram ID'}
     ];
     try{
      const a=await fetch('https://api.telegram.org/bot'+token+'/setMyCommands',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({commands:adminCommands,scope:{type:'chat',chat_id:Number(adminId)}}),
       signal:AbortSignal.timeout(8000)
      });
      const v=await a.json();
      console.log(v.ok?'Telegram: admin commands registered':'Telegram: admin commands unavailable');
     }catch{console.warn('Telegram: failed to configure admin command scope')}
    }
    try{
     const infoRes=await fetch('https://api.telegram.org/bot'+token+'/getWebhookInfo',{signal:AbortSignal.timeout(8000)});
     const info=await infoRes.json();
     const v=info.result||{};
     console.log('Telegram webhook diagnostics:',JSON.stringify({url:v.url,pending:v.pending_update_count,last_error_message:v.last_error_message||null,last_error_date:v.last_error_date||null,allowed_updates:v.allowed_updates||[]}));
    }catch{console.warn('Telegram webhook diagnostics unavailable')}

   }catch{console.warn('Telegram: command registration unavailable')}
  }
 }catch(e){console.warn('Telegram webhook: setup unavailable; use the administrative setup action')}
}
