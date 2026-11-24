import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {db,generateKey,hashKey,safeUser} from '../../../../lib/members';

export const runtime='nodejs';
const LOGIN='https://mandracke.vercel.app/login';
const TELEGRAM_APP='https://mandracke.vercel.app/telegram';
const SUPPORT='https://t.me/mandracke';
const BOT='https://t.me/mandrackecenterkeybot';
const isAdmin=id=>Boolean(process.env.ADMIN_TELEGRAM_ID)&&String(id)===process.env.ADMIN_TELEGRAM_ID;
const adminMenu=()=>({inline_keyboard:[
 [{text:'📊 Resumo administrativo',callback_data:'admin_summary'},{text:'👥 Usuários',callback_data:'admin_users'}],
 [{text:'💳 Créditos dos usuários',callback_data:'admin_credits'},{text:'💳 Recargas pendentes',callback_data:'admin_recharges'}],
 [{text:'🔧 Manutenção',callback_data:'admin_maintenance'},{text:'📨 Mensagens',callback_data:'admin_inbox'}],
 [{text:'📣 Avisos',callback_data:'admin_announcements'},{text:'🔐 Gerenciar Keys',callback_data:'admin_keys'}],
 [{text:'⚙️ Módulos ON / OFF',url:'https://mandracke.vercel.app/admin/modules'}],
 [{text:'📈 Central web',url:'https://mandracke.vercel.app/admin/central'}],
 [{text:'🌐 Abrir painel administrativo',url:'https://mandracke.vercel.app/login?admin=1'}],
 [{text:'⬅️ Menu principal',callback_data:'menu'}]
]});

async function botKeys(chatId,owner,admin=false){
 const rows=await db('mc_login_keys?telegram_id=eq.'+owner+'&select=id,created_at,revoked_at&order=created_at.desc&limit=20');
 const active=rows.filter(k=>!k.revoked_at);
 const buttons=active.map(k=>[{text:'🔑 '+k.id.slice(0,8)+' · '+new Date(k.created_at).toLocaleDateString('pt-BR'),callback_data:(admin?'admin_key_':'my_key_')+k.id}]);
 if(active.length)buttons.push([{text:'🗑 Destruir todas ('+active.length+')',callback_data:(admin?'admin_keys_all_':'my_keys_all_')+owner}]);
 buttons.push([{text:'⬅️ Voltar',callback_data:admin?'admin_keys':'menu'}]);
 return chat(chatId,(admin?'🛡 KEYS DO USUÁRIO '+owner:'🔑 MINHAS KEYS')+'\n\nAtivas: '+active.length+'\nRevogadas: '+rows.filter(x=>x.revoked_at).length+'\n\nSelecione uma key para revogar. A operação é definitiva.',{reply_markup:{inline_keyboard:buttons}});
}
async function revokeBotKeys(chatId,ids,owner,actor){
 const result=await db('rpc/mc_revoke_keys',{method:'POST',body:{p_ids:ids,p_owner:owner,p_actor:actor,p_reason:'Revogada no Telegram'}});
 const count=Array.isArray(result)?result.length:0;
 await chat(chatId,'✅ '+count+' key(s) revogada(s). Sessões antigas foram invalidadas. Para voltar a entrar no site, gere uma nova key no bot.');
 if(actor.startsWith('admin:')&&String(owner)!==String(chatId)&&count){
  try{await chat(owner,'🔒 Sua key foi revogada pelo administrador. Se a emissão estiver liberada, gere outra key no bot com /key.')}catch(e){console.warn('Key notice could not be sent')}
 }
 return;
}

async function adminAction(action,chatId,id){
 if(!isAdmin(id)){await chat(chatId,'⛔ Acesso restrito ao administrador.');return}
 if(action==='admin'){
  return chat(chatId,'🛡 ADMINISTRADOR — MANDRACKE CENTER\n\nAcesso reconhecido pelo seu Telegram ID. Seu plano e créditos como usuário não são alterados por este reconhecimento.\n\nEscolha abaixo:',{reply_markup:adminMenu()});
 }

 if(action==='admin_keys'){
  const users=await db('mc_users?select=telegram_id,first_name,username&order=created_at.desc&limit=30');
  const btn=users.map(u=>[{text:'👤 '+(u.first_name||u.username||u.telegram_id).slice(0,18)+' · '+u.telegram_id,callback_data:'admin_keys_user_'+u.telegram_id}]);
  btn.push([{text:'⚠️ Destruir TODAS as keys do sistema',callback_data:'admin_keys_global_confirm'}]);
  btn.push([{text:'⬅️ Admin',callback_data:'admin'}]);
  return chat(chatId,'🔐 KEYS — ADMIN\n\nEscolha um usuário ou use a opção global. Para pesquisar qualquer Telegram ID, envie /keysusuario 123456789.',{reply_markup:{inline_keyboard:btn}});
 }
 const ownerMatch=/^admin_keys_user_(\d{1,20})$/.exec(action);
 if(ownerMatch)return botKeys(chatId,ownerMatch[1],true);
 const confirmSingle=/^admin_key_([0-9a-f-]{36})$/i.exec(action);
 if(confirmSingle){
  const rows=await db('mc_login_keys?id=eq.'+confirmSingle[1]+'&select=id,telegram_id,revoked_at');
  if(!rows.length||rows[0].revoked_at)return chat(chatId,'Key não encontrada ou já revogada.');
  const k=rows[0];
  return chat(chatId,'⚠️ CONFIRMAR DESTRUIÇÃO\n\nKey '+k.id.slice(0,8)+' do usuário '+k.telegram_id+' será inutilizada permanentemente.',{reply_markup:{inline_keyboard:[[{text:'✅ Destruir key',callback_data:'admin_key_yes_'+k.id}],[{text:'❌ Cancelar',callback_data:'admin_keys_user_'+k.telegram_id}]]}});
 }
 const applySingle=/^admin_key_yes_([0-9a-f-]{36})$/i.exec(action);
 if(applySingle){
  const rows=await db('mc_login_keys?id=eq.'+applySingle[1]+'&select=telegram_id');
  if(!rows.length)return chat(chatId,'Key não encontrada.');
  return revokeBotKeys(chatId,[applySingle[1]],String(rows[0].telegram_id),'admin:'+id);
 }
 const allConfirm=/^admin_keys_all_(\d{1,20})$/.exec(action);
 if(allConfirm)return chat(chatId,'⚠️ CONFIRMAR\n\nDestruir todas as keys do usuário '+allConfirm[1]+'? Esta ação encerra sessões.',{reply_markup:{inline_keyboard:[[{text:'✅ Confirmar destruição',callback_data:'admin_keys_all_yes_'+allConfirm[1]}],[{text:'❌ Cancelar',callback_data:'admin_keys_user_'+allConfirm[1]}]]}});
 const allYes=/^admin_keys_all_yes_(\d{1,20})$/.exec(action);
 if(allYes){
  const n=await db('rpc/mc_revoke_all_keys',{method:'POST',body:{p_owner:allYes[1],p_actor:'admin:'+id,p_reason:'Revogação total pelo administrador no Telegram'}});
  await chat(chatId,'✅ '+n+' key(s) destruída(s) do usuário '+allYes[1]+'.');
  try{await chat(allYes[1],'🔒 Todas as suas keys foram revogadas pelo administrador. Use /key para solicitar outra, se permitido.')}catch(e){}
  return;
 }
 if(action==='admin_keys_global_confirm')return chat(chatId,'⛔ ATENÇÃO: ESTA AÇÃO REVOKARÁ TODAS AS KEYS DE TODOS OS USUÁRIOS, INCLUSIVE AS SUAS. Confirme novamente.',{reply_markup:{inline_keyboard:[[{text:'⚠️ Continuar',callback_data:'admin_keys_global_confirm2'}],[{text:'❌ Cancelar',callback_data:'admin_keys'}]]}});
 if(action==='admin_keys_global_confirm2')return chat(chatId,'Confirmação FINAL: todas as keys serão inutilizadas e todas as sessões encerradas.',{reply_markup:{inline_keyboard:[[{text:'🗑 DESTRUIR TODAS',callback_data:'admin_keys_global_yes'}],[{text:'❌ Cancelar',callback_data:'admin_keys'}]]}});
 if(action==='admin_keys_global_yes'){
  const n=await db('rpc/mc_revoke_all_keys',{method:'POST',body:{p_owner:null,p_actor:'admin:'+id,p_reason:'Revogação global pelo Telegram'}});
  return chat(chatId,'✅ Revogação global concluída. '+n+' keys invalidadas. Usuários deverão gerar novas keys.');
 }

 if(action==='admin_summary'){
  const [users,recharges]=await Promise.all([
   db('mc_users?select=telegram_id,plan,promo_pro_until'),
   db('mc_recharges?select=status')
  ]);
  const pending=recharges.filter(x=>x.status==='pending').length;
  const promos=users.filter(x=>x.plan==='FREE'&&x.promo_pro_until&&new Date(x.promo_pro_until)>new Date()).length;
  return chat(chatId,'📊 RESUMO ADMINISTRATIVO\n\nUsuários: '+users.length+'\nPRO promocionais ativos: '+promos+'\nRecargas pendentes: '+pending,{reply_markup:adminMenu()});
 }
 if(action==='admin_users'){
  const users=await db('mc_users?select=telegram_id,username,first_name,plan,credits,enabled&order=created_at.desc&limit=15');
  const lines=users.map(x=>'• '+(x.first_name||x.username||'Usuário')+' — ID '+x.telegram_id+' — '+x.plan+' — '+x.credits+' créditos'+(x.enabled?'':' (bloqueado)'));
  return chat(chatId,'👥 ÚLTIMOS USUÁRIOS\n\n'+(lines.join('\n')||'Nenhum usuário registrado.')+'\n\nPara editar plano e créditos, use o painel administrativo.',{reply_markup:adminMenu()});
 }
 if(action==='admin_maintenance'){
  const settings=await db('mc_settings?key=eq.maintenance&select=value');
  const enabled=settings[0]?.value?.enabled===true;
  return chat(chatId,'🔧 MANUTENÇÃO\n\nEstado: '+(enabled?'ATIVA':'SITE ONLINE')+'\n\nConfirme a alteração:',{reply_markup:{inline_keyboard:[
   [{text:enabled?'✅ Reabrir site':'🔧 Ativar manutenção',callback_data:enabled?'admin_maintenance_off':'admin_maintenance_on'}],
   [{text:'⬅️ Admin',callback_data:'admin'}]
  ]}});
 }
 if(action==='admin_maintenance_on'||action==='admin_maintenance_off'){
  const enabled=action.endsWith('_on');
  const settings=await db('mc_settings?key=eq.maintenance&select=value');
  const message=settings[0]?.value?.message||'Estamos em manutenção. Voltaremos em breve.';
  await db('mc_settings?key=eq.maintenance',{method:'PATCH',body:{value:{enabled,message}},prefer:'return=minimal'});
  return chat(chatId,'✅ '+(enabled?'Manutenção ativada. Visitantes verão a tela de manutenção.':'Manutenção desativada. Site reaberto.'),{reply_markup:adminMenu()});
 }
 if(action==='admin_inbox'){
  const items=await db('mc_inbox?select=id,telegram_id,message_text,created_at&order=created_at.desc&limit=8');
  const lines=items.map(x=>'• #'+x.id+' · ID '+x.telegram_id+'\n'+x.message_text.slice(0,180));
  return chat(chatId,'📨 MENSAGENS RECEBIDAS\n\n'+(lines.join('\n\n')||'Nenhuma mensagem.')+'\n\nAcesse o painel para visualizar as demais.',{reply_markup:adminMenu()});
 }
 if(action==='admin_announcements'){
  return chat(chatId,'📣 AVISOS AOS USUÁRIOS\n\nAbra a Central web para criar e enviar avisos em lotes, ou use /avisar seguido do texto para registrar um novo aviso.\n\nExemplo: /avisar Atualização da plataforma às 20h.\n\nSomente usuários inscritos que iniciaram o bot receberão avisos.',{reply_markup:adminMenu()});
 }

 if(action==='admin_credits'){
  const users=await db('mc_users?select=telegram_id,username,first_name,credits,enabled&order=created_at.desc&limit=15');
  const rows=users.map(u=>[{text:(u.first_name||u.username||'Usuário').slice(0,18)+' · '+u.credits+' créditos',callback_data:'admin_user_'+u.telegram_id}]);
  return chat(chatId,'💳 CRÉDITOS — ADMIN\n\nSelecione o usuário cadastrado. Todas as alterações exigem confirmação.',{reply_markup:{inline_keyboard:[...rows,[{text:'⬅️ Administração',callback_data:'admin'}]]}});
 }
 const userMatch=/^admin_user_(\d{4,20})$/.exec(action);
 if(userMatch){
  const uid=userMatch[1],users=await db('mc_users?telegram_id=eq.'+uid+'&select=telegram_id,username,first_name,credits,enabled');
  if(!users.length)return chat(chatId,'Usuário não encontrado.');
  const u=users[0];
  return chat(chatId,'👤 GERENCIAR CRÉDITOS\n\nUsuário: '+(u.first_name||u.username||'Sem nome')+'\nID: '+uid+'\nSaldo atual: '+u.credits+' créditos\n\nSelecione uma operação:',{reply_markup:{inline_keyboard:[
   [{text:'➕ Adicionar 100',callback_data:'admin_credit_preview_'+uid+'_100'},{text:'➕ Adicionar 500',callback_data:'admin_credit_preview_'+uid+'_500'}],
   [{text:'➕ Adicionar 1000',callback_data:'admin_credit_preview_'+uid+'_1000'},{text:'➖ Remover 100',callback_data:'admin_credit_preview_'+uid+'_-100'}],
   [{text:'⬅️ Usuários',callback_data:'admin_credits'}]
  ]}});
 }
 const preview=/^admin_credit_preview_(\d{4,20})_(-?\d{1,5})$/.exec(action);
 if(preview){
  const uid=preview[1],delta=Number(preview[2]);
  if(!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>5000)return chat(chatId,'Quantidade inválida.');
  const u=(await db('mc_users?telegram_id=eq.'+uid+'&select=telegram_id,first_name,username,credits,enabled'))[0];
  if(!u||!u.enabled)return chat(chatId,'Usuário não encontrado ou desativado.');
  if(Number(u.credits)+delta<0)return chat(chatId,'Saldo insuficiente para este débito.');
  const created=await db('mc_bot_credit_actions',{method:'POST',body:{telegram_id:uid,delta},prefer:'return=representation'});
  const actionId=created?.[0]?.id;
  if(!actionId)throw Error('Falha ao criar confirmação');
  return chat(chatId,'⚠️ CONFIRMAR AJUSTE\n\nUsuário: '+(u.first_name||u.username||uid)+'\nID: '+uid+'\nOperação: '+(delta>0?'+':'')+delta+' créditos\nSaldo atual: '+u.credits+'\nNovo saldo estimado: '+(Number(u.credits)+delta)+'\n\nConfirma a operação?',{reply_markup:{inline_keyboard:[
   [{text:'✅ Confirmar alteração',callback_data:'admin_credit_apply_'+actionId}],
   [{text:'❌ Cancelar',callback_data:'admin_user_'+uid}]
  ]}});
 }
 const apply=/^admin_credit_apply_([0-9a-f-]{36})$/i.exec(action);
 if(apply){
  // Single-use atomic action prevents repeated clicks from granting duplicate credits.
  const out=await db('rpc/mc_apply_bot_credit_action',{method:'POST',body:{p_action_id:apply[1]}});
  const result=Array.isArray(out)?out[0]:null;
  if(!result)return chat(chatId,'Confirmação expirada ou já utilizada.');
  const uid=String(result.telegram_id),delta=Number(result.amount),balance=result.new_balance;
  await chat(chatId,'✅ SALDO ATUALIZADO\n\nUsuário ID: '+uid+'\nAjuste: '+(delta>0?'+':'')+delta+'\nSaldo atual: '+balance+' créditos.',{reply_markup:{inline_keyboard:[[{text:'👤 Ver usuário',callback_data:'admin_user_'+uid}],[{text:'⬅️ Admin',callback_data:'admin'}]]}});
  try{await chat(Number(uid),'💳 CRÉDITOS ATUALIZADOS\n\nSeu saldo foi ajustado pelo administrador.\nAlteração: '+(delta>0?'+':'')+delta+' créditos\nNovo saldo: '+balance+' créditos.')}catch(e){console.warn('Credit notification unavailable')}
  return;
 }
 if(action==='admin_recharges'){
  const rows=await db('mc_recharges?status=eq.pending&select=id,telegram_id,credits_requested,created_at&order=created_at.asc&limit=10');
  if(!rows.length)return chat(chatId,'✅ Nenhuma recarga pendente.',{reply_markup:adminMenu()});
  const buttons=rows.map(r=>[{text:'💳 '+r.credits_requested+' créditos · ID '+r.telegram_id,callback_data:'admin_recharge_view_'+r.id}]);
  return chat(chatId,'💳 RECARGAS PENDENTES\n\nSelecione um pedido para aprovar ou recusar. O saldo só é atualizado após confirmação.',{reply_markup:{inline_keyboard:[...buttons,[{text:'⬅️ Admin',callback_data:'admin'}]]}});
 }
 const rechargeView=/^admin_recharge_view_([0-9a-f-]{36})$/i.exec(action);
 if(rechargeView){
  const request=(await db('mc_recharges?id=eq.'+rechargeView[1]+'&select=id,telegram_id,credits_requested,status'))[0];
  if(!request||request.status!=='pending')return chat(chatId,'Pedido não encontrado ou já analisado.');
  return chat(chatId,'💳 CONFIRMAR RECARGA\n\nUsuário ID: '+request.telegram_id+'\nQuantidade: '+request.credits_requested+' créditos\nStatus: Pendente\n\nAprovar adicionará o saldo automaticamente uma única vez.',{reply_markup:{inline_keyboard:[
   [{text:'✅ Aprovar e creditar',callback_data:'admin_recharge_yes_'+request.id}],
   [{text:'❌ Recusar pedido',callback_data:'admin_recharge_no_'+request.id}],
   [{text:'⬅️ Pedidos',callback_data:'admin_recharges'}]
  ]}});
 }
 const rechargeDecision=/^admin_recharge_(yes|no)_([0-9a-f-]{36})$/i.exec(action);
 if(rechargeDecision){
  const approve=rechargeDecision[1]==='yes',rid=rechargeDecision[2];
  const rows=await db('mc_recharges?id=eq.'+rid+'&select=id,telegram_id,credits_requested,status');
  if(!rows.length||rows[0].status!=='pending')return chat(chatId,'Esse pedido já foi analisado ou não existe.');
  await db('rpc/mc_review_recharge',{method:'POST',body:{p_recharge_id:rid,p_approve:approve}});
  const recipient=String(rows[0].telegram_id);
  const current=(await db('mc_users?telegram_id=eq.'+recipient+'&select=credits'))[0];
  await chat(chatId,'✅ RECARGA '+(approve?'APROVADA':'RECUSADA')+'\n\nUsuário ID: '+recipient+'\nCréditos solicitados: '+rows[0].credits_requested+'\nSaldo atual: '+(current?.credits??'indisponível'),{reply_markup:{inline_keyboard:[[{text:'⬅️ Recargas',callback_data:'admin_recharges'}]]}});
  try{await chat(Number(recipient),'📩 ATUALIZAÇÃO DA RECARGA\n\nSua solicitação de '+rows[0].credits_requested+' créditos foi '+(approve?'aprovada e creditada.':'recusada.')+'\nSaldo atual: '+(current?.credits??'consulte o painel')+' créditos.')}catch(e){console.warn('Recharge notification unavailable')}
  return;
 }

}

async function trackEvent(id,event_type){
 try{await db('mc_usage_events',{method:'POST',body:{telegram_id:id,event_type},prefer:'return=minimal'})}catch(e){console.warn('Usage event recording failed')}
}
async function subscribe(id,enabled){
 await db('mc_users?telegram_id=eq.'+id,{method:'PATCH',body:{announcements_enabled:enabled},prefer:'return=minimal'});
}
const menu=[
 [{text:'🔑 Gerar Key',callback_data:'key'},{text:'👤 Minha Conta',callback_data:'account'}],
 [{text:'🗝 Minhas Keys',callback_data:'my_keys'}],
 [{text:'💳 Créditos',callback_data:'credits'},{text:'📊 Limites',callback_data:'limits'}],
 [{text:'🟢 Status',callback_data:'status'},{text:'📖 Ajuda',callback_data:'help'}],
 [{text:'📜 Histórico',callback_data:'history'},{text:'➕ Recarga',callback_data:'recharge'}],
 [{text:'🖼 Atualizar Foto',callback_data:'photo'},{text:'✏️ Atualizar Nome',callback_data:'name'}],
 [{text:'🛡 Desconectar Dispositivos',callback_data:'disconnect'}],
 [{text:'👥 Grupo da Central',callback_data:'group'}],
 [{text:'🌐 Abrir site (login automático)',url:LOGIN},{text:'🆘 Suporte',url:SUPPORT}]
];

async function telegram(method,body){
 const t=process.env.TELEGRAM_BOT_TOKEN;
 const r=await fetch('https://api.telegram.org/bot'+t+'/'+method,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
  signal:AbortSignal.timeout(12000),cache:'no-store'
 });
 const x=await r.json();
 if(!r.ok||!x.ok)throw Error('Telegram API '+method+': '+String(x.description||r.status));
 return x.result;
}
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function pretty(text){
 const lines=esc(text).split('\n');
 if(lines[0]&&lines[0].length<100&&/^(?:[^\w]*[A-ZÀ-Ú][A-ZÀ-Ú0-9\s—–:\/\-]{3,}|[^\w]*MANDRACKE)/u.test(lines[0]))lines[0]='<b>'+lines[0]+'</b>';
 return lines.map((line,i)=>{
  if(i===0)return line;
  return line.replace(/^(\s*(?:Nome|Telegram|ID|Plano|Créditos|MC|Saldo atual|Situação|Status|Estado|Usuários|Recargas pendentes|Limites|Login|Fonte|Sua key permanente|Key|Créditos disponíveis|PRO promocionais ativos))(\s*:)/i,'<b>$1$2</b>');
 }).join('\n');
}
const chat=(chat_id,text,options={})=>telegram('sendMessage',{chat_id,text:options.parse_mode==='HTML'?text:pretty(text),parse_mode:'HTML',disable_web_page_preview:true,...options});
async function externalLoginUrl(id){
 const ticket=randomBytes(32).toString('base64url');
 await db('mc_browser_tickets',{method:'POST',body:{telegram_id:id,ticket_hash:hashKey(ticket),expires_at:new Date(Date.now()+3*60*1000).toISOString()},prefer:'return=minimal'});
 return 'https://mandracke.vercel.app/entrar?ticket='+encodeURIComponent(ticket);
}
async function keyboard(id,extra=[]){
 let url=LOGIN;
 try{url=await externalLoginUrl(id)}catch(e){console.warn('Browser ticket unavailable',String(e))}
 const rows=menu.map(row=>row.map(item=>item.text?.includes('Abrir site')?{text:'🌐 Abrir site no navegador',url}:item));
 return {inline_keyboard:[...rows,...extra]};
}
function tidyCommand(text){return String(text||'').trim().split(/\s+/)[0].toLowerCase().split('@')[0]}
function fullPlan(u){return safeUser(u).effective_plan}
async function getUser(id){
 if(isAdmin(id))await db('rpc/mc_refresh_admin_allowance',{method:'POST',body:{p_telegram_id:id}});
 const users=await db('mc_users?telegram_id=eq.'+id+'&select=telegram_id,username,first_name,credits,created_at,plan,promo_pro_until,enabled,photo_file_id,session_version,mc_tokens,admin_allowance_day');
 return users[0]||null;
}
async function intro(id,name){
 const u=await getUser(id);
 const state=u?'Seu cadastro já está ativo.':'Use “🔑 Gerar Key” para ativar sua conta.';
 await chat(id,'🟣 MANDRACKE CENTER\n\nOlá, '+(name||'usuário')+'! Bem-vindo à central.\n'+state+'\n\nSelecione uma opção abaixo.\n\n📢 Você poderá receber avisos da central. Para cancelar: /pararavisos.',{reply_markup:await keyboard(id,isAdmin(id)?[[{text:'🛡 Administração',callback_data:'admin'}]]:[])});
}
async function issueKey(chatId,telegramId,from){
 const key=generateKey();
 const out=await db('rpc/mc_activate_telegram',{method:'POST',body:{
  p_telegram_id:telegramId,p_username:String(from?.username||'').slice(0,80),
  p_first_name:String(from?.first_name||'').slice(0,100),p_key_hash:hashKey(key)
 }});
 const expiry=Array.isArray(out)?out[0]?.promo_pro_until:null;
 const promo=expiry&&new Date(expiry)>new Date();
 const when=promo?'\n\n🎁 <b>PRO promocional ativo até:</b> '+esc(new Date(expiry).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})):'';
 let link=LOGIN;
 try{link=await externalLoginUrl(telegramId)}catch(e){console.warn('Secure browser link unavailable',String(e))}
 const html='🔑 <b>MANDRACKE CENTER — SUA KEY</b>\n\n'+
 'Sua <b>key permanente</b> de acesso:\n\n<code>'+esc(key)+'</code>\n\n'+
 '👆 Toque na key acima para selecioná-la ou use <b>Copiar Key</b>.\n\n'+
 '🌐 <b>Entrar no site:</b> '+esc(LOGIN)+'\n'+
 'O botão de acesso rápido utiliza um link temporário, válido por 3 minutos e apenas uma vez.'+
 when+'\n\n⚠️ <b>Importante:</b> não compartilhe a key. Uma nova key substitui a anterior.';
 await chat(chatId,html,{parse_mode:'HTML',reply_markup:{inline_keyboard:[
  [{text:'📋 Copiar Key',copy_text:{text:key}}],
  [{text:'🌐 Abrir site no navegador',url:link}],
  [{text:'👤 Minha Conta',callback_data:'account'},{text:'⬅️ Menu',callback_data:'menu'}]
 ]}});
}
async function account(chatId,id){
 const u=await getUser(id);
 if(!u)return chat(chatId,'Você ainda não está cadastrado. Clique em Gerar Key.',{reply_markup:{inline_keyboard:[[{text:'🔑 Gerar Key',callback_data:'key'}]]}});
 const active=u.enabled!==false;
 const promo=u.promo_pro_until&&new Date(u.promo_pro_until)>new Date();
 await chat(chatId,'👤 MINHA CONTA\n\nNome: '+(u.first_name||'Não informado')+
 '\nTelegram: @'+(u.username||'sem username')+
 '\nID: '+u.telegram_id+
 '\nPlano: '+fullPlan(u)+(promo?'\n🎁 PRO até '+new Date(u.promo_pro_until).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'')+
 '\nCréditos: '+Number(u.credits).toLocaleString('pt-BR')+
 (isAdmin(id)?'\nMC: '+Number(u.mc_tokens||0).toLocaleString('pt-BR')+' / 1.500 (renovação diária à 00h, Brasília)':'')+
 '\nSituação: '+(active?'Ativa':'Desativada')+
 '\nKey: permanente (não exibida novamente por segurança).',
 {reply_markup:await keyboard(id)});
}
async function credits(chatId,id){
 const u=await getUser(id);
 if(!u)return chat(chatId,'Cadastre sua conta primeiro com Gerar Key.');
 await chat(chatId,'💳 CRÉDITOS\n\nSaldo atual: '+Number(u.credits).toLocaleString('pt-BR')+
 ' créditos.\nPlano: '+fullPlan(u)+(isAdmin(id)?'\nMC: '+Number(u.mc_tokens||0).toLocaleString('pt-BR')+' / 1500 (diários)':'')+'\n\nO saldo é consultado diretamente no banco de dados. Recargas só são creditadas após aprovação do administrador.',
 {reply_markup:{inline_keyboard:[[{text:'➕ Solicitar recarga',callback_data:'recharge'}],[{text:'⬅️ Menu',callback_data:'menu'}]]}});
}
async function limits(chatId,id){
 const u=await getUser(id);
 if(!u)return chat(chatId,'Cadastre sua conta primeiro com Gerar Key.');
 const plan=fullPlan(u);
 await chat(chatId,'📊 PLANO E LIMITES\n\nPlano ativo: '+plan+
 '\nCréditos disponíveis: '+Number(u.credits).toLocaleString('pt-BR')+
 '\n\nOs limites específicos de cada ferramenta ainda dependem da configuração do administrador. Nenhum limite não cadastrado será apresentado como válido.',
 {reply_markup:{inline_keyboard:[[{text:'👤 Minha Conta',callback_data:'account'}],[{text:'⬅️ Menu',callback_data:'menu'}]]}});
}
async function history(chatId,id){
 const rows=await db('mc_recharges?telegram_id=eq.'+id+'&select=credits_requested,status,created_at&order=created_at.desc&limit=8');
 const labels={pending:'Pendente',approved:'Aprovada',rejected:'Recusada'};
 const lines=rows.map(x=>'• '+x.credits_requested+' créditos — '+(labels[x.status]||x.status)+' ('+new Date(x.created_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})+')');
 await chat(chatId,'📜 HISTÓRICO DE RECARGAS\n\n'+(lines.length?lines.join('\n'):'Nenhuma solicitação registrada.'),{reply_markup:{inline_keyboard:[[{text:'⬅️ Menu',callback_data:'menu'}]]}});
}
async function recharge(chatId,id,amount){
 const flags=await db('mc_module_settings?module_id=eq.credits&select=enabled,off_message');
 if(flags[0]?.enabled===false)return chat(chatId,'⛔ RECARGAS — OFF\n\n'+(flags[0].off_message||'Esta função está temporariamente indisponível.'),{reply_markup:{inline_keyboard:[[{text:'⬅️ Menu',callback_data:'menu'}]]}});
 const u=await getUser(id);
 if(!u||u.enabled===false)return chat(chatId,'Conta inexistente ou desativada.');
 if(!Number.isSafeInteger(amount)||amount<1||amount>100000)return chat(chatId,'Quantidade inválida. Use /recarga 100 (de 1 a 100000 créditos).');
 await db('mc_recharges',{method:'POST',body:{telegram_id:id,credits_requested:amount,status:'pending'},prefer:'return=minimal'});
 await chat(chatId,'✅ Pedido de '+amount+' créditos registrado.\n\nStatus: PENDENTE. A recarga não realiza pagamentos e os créditos só serão adicionados após a aprovação do administrador.',{reply_markup:{inline_keyboard:[[{text:'📜 Histórico',callback_data:'history'}],[{text:'⬅️ Menu',callback_data:'menu'}]]}});
}
async function rechargeMenu(id){
 await chat(id,'➕ RECARGA DE CRÉDITOS\n\nSelecione uma quantidade ou envie /recarga 100 para um valor personalizado.\n\nNenhuma cobrança automática é efetuada. A solicitação ficará pendente até a aprovação.',{reply_markup:{inline_keyboard:[
 [{text:'100 créditos',callback_data:'recharge_100'},{text:'500 créditos',callback_data:'recharge_500'}],
 [{text:'1000 créditos',callback_data:'recharge_1000'}],
 [{text:'⬅️ Menu',callback_data:'menu'}]
 ]}});
}
async function namePrompt(id){await chat(id,'✏️ ATUALIZAR NOME\n\nResponda a esta mensagem com o nome desejado (até 80 caracteres). A alteração será exibida no painel; seu nome público do Telegram não será modificado.',{reply_markup:{force_reply:true,input_field_placeholder:'Novo nome'}})}
async function photoPrompt(id){await chat(id,'🖼 ATUALIZAR FOTO\n\nResponda a esta mensagem enviando uma foto. Salvaremos apenas a referência privada da imagem no Telegram, não a imagem no banco.',{reply_markup:{force_reply:true}})}
async function updateName(chatId,id,name){
 const u=await getUser(id);if(!u)return chat(chatId,'Cadastre a conta com Gerar Key antes de atualizar o perfil.');
 const clean=String(name||'').trim();if(clean.length<2||clean.length>80)return chat(chatId,'Nome inválido: use entre 2 e 80 caracteres.');
 await db('mc_users?telegram_id=eq.'+id,{method:'PATCH',body:{first_name:clean},prefer:'return=minimal'});
 await chat(chatId,'✅ Nome atualizado para: '+clean,{reply_markup:await keyboard(id)});
}
async function updatePhoto(chatId,id,photo){
 const u=await getUser(id);if(!u)return chat(chatId,'Cadastre sua conta primeiro.');
 const fileId=photo?.at(-1)?.file_id;
 if(!fileId)return chat(chatId,'Envie uma foto, não um arquivo de outro tipo.');
 await db('mc_users?telegram_id=eq.'+id,{method:'PATCH',body:{photo_file_id:fileId},prefer:'return=minimal'});
 await chat(chatId,'✅ Referência da foto atualizada no seu perfil. Seu avatar do Telegram não foi alterado.',{reply_markup:await keyboard(id)});
}
async function disconnect(chatId,id){
 const u=await getUser(id);
 if(!u)return chat(chatId,'Cadastre sua conta primeiro.');
 await db('rpc/mc_disconnect_sessions',{method:'POST',body:{p_telegram_id:id}});
 await chat(chatId,'🛡 DISPOSITIVOS DESCONECTADOS\n\nAs sessões anteriores do painel foram invalidadas. Sua key permanente continua válida e pode ser usada para entrar novamente.',{reply_markup:await keyboard(id)});
}

async function myKeysAction(action,chatId,id){
 if(action==='my_keys')return botKeys(chatId,id,false);
 const one=/^my_key_([0-9a-f-]{36})$/i.exec(action);
 if(one){
  const rows=await db('mc_login_keys?id=eq.'+one[1]+'&telegram_id=eq.'+id+'&revoked_at=is.null&select=id');
  if(!rows.length)return chat(chatId,'Key não encontrada ou revogada.');
  return chat(chatId,'⚠️ Confirmar destruição da key '+one[1].slice(0,8)+'? Sua sessão no site será encerrada.',{reply_markup:{inline_keyboard:[[{text:'✅ Destruir',callback_data:'my_key_yes_'+one[1]}],[{text:'❌ Cancelar',callback_data:'my_keys'}]]}});
 }
 const yes=/^my_key_yes_([0-9a-f-]{36})$/i.exec(action);
 if(yes)return revokeBotKeys(chatId,[yes[1]],id,'telegram:'+id);
 if(action==='my_keys_all_'+id)return chat(chatId,'⚠️ Destruir TODAS as suas keys? Você precisará gerar outra no bot.',{reply_markup:{inline_keyboard:[[{text:'✅ Destruir todas',callback_data:'my_keys_all_yes_'+id}],[{text:'❌ Cancelar',callback_data:'my_keys'}]]}});
 if(action==='my_keys_all_yes_'+id){
  const n=await db('rpc/mc_revoke_all_keys',{method:'POST',body:{p_owner:id,p_actor:'telegram:'+id,p_reason:'Revogação total pelo titular no Telegram'}});
  return chat(chatId,'✅ '+n+' key(s) revogada(s). Use /key para emitir uma nova.');
 }
}

async function mainAction(action,chatId,id,from){
 if(action==='my_keys'||action.startsWith('my_key_')||action.startsWith('my_keys_'))return myKeysAction(action,chatId,id);
 if(action==='admin'||action.startsWith('admin_'))return adminAction(action,chatId,id);
 switch(action){
  case 'menu':return intro(chatId,from?.first_name);
  case 'key':return issueKey(chatId,id,from);
  case 'account':return account(chatId,id);
  case 'status':{
   const settings=await db('mc_settings?key=eq.maintenance&select=value');
   const isMaintenance=settings[0]?.value?.enabled===true;
   return chat(chatId,'🟢 STATUS DA CENTRAL\n\nSite: '+(isMaintenance?'Em manutenção':'Online')+'\nTelegram: conectado\n\nLink do site: '+LOGIN,{reply_markup:{inline_keyboard:[[{text:'🌐 Abrir site',url:await externalLoginUrl(id)}],[{text:'⬅️ Menu',callback_data:'menu'}]]}});
  }
  case 'telegram_id':return chat(chatId,'🪪 SEU TELEGRAM ID\n\nID: '+id+'\n\nEste identificador vincula sua conta à central.',{reply_markup:{inline_keyboard:[[{text:'⬅️ Menu',callback_data:'menu'}]]}});
  case 'help':return chat(chatId,'📖 AJUDA — MANDRACKE CENTER\n\n/start — menu principal\n/key — gerar nova key\n/conta — plano, saldo e conta\n/creditos — consultar créditos\n/limites — limites do plano\n/historico — recargas\n/recarga 100 — solicitar créditos\n/status — situação do sistema\n/id — identificar sua conta\n/pararavisos — cancelar comunicados\n/receberavisos — voltar a receber\n\nPara falar com a equipe, envie uma mensagem comum ao bot.',{reply_markup:{inline_keyboard:[[{text:'⬅️ Menu',callback_data:'menu'}]]}});
  case 'credits':return credits(chatId,id);
  case 'limits':return limits(chatId,id);
  case 'history':return history(chatId,id);
  case 'recharge':return rechargeMenu(chatId);
  case 'name':return namePrompt(chatId);
  case 'photo':return photoPrompt(chatId);
  case 'disconnect':return disconnect(chatId,id);
  case 'group':{
   const url=process.env.CENTRAL_GROUP_URL;
   return chat(chatId,url?'👥 GRUPO DA CENTRAL\n\n'+url:'O administrador ainda não configurou o convite do grupo.',{reply_markup:await keyboard(id)});
  }
  case 'support':return chat(chatId,'🆘 SUPORTE\n\n'+SUPPORT,{reply_markup:await keyboard(id)});
  default:{
   const m=/^recharge_(100|500|1000)$/.exec(action);
   if(m)return recharge(chatId,id,Number(m[1]));
   return intro(chatId,from?.first_name);
  }
 }
}
function asAction(text){
 const cmd=tidyCommand(text);
 return ({'/start':'start','/menu':'menu','/key':'key','/gerarkey':'key','/conta':'account','/creditos':'credits','/limites':'limits','/historico':'history','/recarga':'recharge','/grupo':'group','/suporte':'support','/nome':'name','/foto':'photo','/dispositivos':'disconnect','/help':'help','/ajuda':'help','/status':'status','/id':'telegram_id','/m inhaskeys':'my_keys','/minhaskeys':'my_keys','/keys':'my_keys','/admin':'admin','/gerenciarcreditos':'admin_credits','/pendentes':'admin_recharges','/mensagens':'admin_inbox','/manutencao':'admin_maintenance','/avisos':'admin_announcements'})[cmd]||null;
}
export async function POST(req){
 const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
 if(!secret||secret.length<16||req.headers.get('x-telegram-bot-api-secret-token')!==secret||!process.env.TELEGRAM_BOT_TOKEN)return NextResponse.json({error:'Forbidden'},{status:403});
 let update;try{update=await req.json()}catch{return NextResponse.json({ok:true})}
 const callback=update?.callback_query;
 const msg=update?.message;
 const from=callback?.from||msg?.from;
 const id=from?.id,chatId=callback?.message?.chat?.id||msg?.chat?.id;
 if(!Number.isSafeInteger(id)||id<=0||id!==chatId||((msg?.chat?.type||callback?.message?.chat?.type)!=='private'))return NextResponse.json({ok:true});
 try{
  if(callback){
   await telegram('answerCallbackQuery',{callback_query_id:callback.id});
   await trackEvent(id,'bot_action');
   await mainAction(String(callback.data||''),chatId,id,from);
  }else{
   const text=String(msg.text||''),command=asAction(text);
   if(command==='start'){
    const existing=await getUser(id);
    if(!existing)await issueKey(chatId,id,from);
    await db('mc_users?telegram_id=eq.'+id,{method:'PATCH',body:{last_bot_seen_at:new Date().toISOString()},prefer:'return=minimal'});
    await trackEvent(id,'bot_start');
    if(/^\/start(?:@\w+)?\s+recarga(?:\s|$)/i.test(text.trim()))await rechargeMenu(chatId);
    else await intro(chatId,from?.first_name);
   }else if(tidyCommand(text)==='/pararavisos'){
    await subscribe(id,false);await chat(chatId,'🔕 Você não receberá novos avisos da central. Para voltar a receber, envie /receberavisos.');
   }else if(tidyCommand(text)==='/receberavisos'){
    await subscribe(id,true);await chat(chatId,'🔔 Avisos da central ativados.');
   }else if(tidyCommand(text)==='/responder'){
    if(!isAdmin(id))return NextResponse.json({error:'Não autorizado'},{status:403});
    const m=/^\/responder\s+(\d{4,20})\s+([\s\S]{1,1500})$/.exec(text.trim());
    if(!m)await chat(chatId,'Uso: /responder TELEGRAM_ID Sua mensagem (até 1500 caracteres).');
    else{
     const targetId=m[1],response=m[2].trim();
     if(response.length<1||response.length>1500)await chat(chatId,'Mensagem inválida.');
     else{
      const user=await getUser(Number(targetId));
      if(!user)await chat(chatId,'Usuário não encontrado na central.');
      else{
       await chat(Number(targetId),'📨 RESPOSTA DO SUPORTE MANDRACKE CENTER\n\n'+response);
       await chat(chatId,'✅ Resposta enviada ao Telegram ID '+targetId);
      }
     }
    }
   }else if(tidyCommand(text)==='/avisar'){
    if(!isAdmin(id))return NextResponse.json({error:'Não autorizado'},{status:403});
    const notice=text.slice(text.indexOf(' ')+1).trim();
    if(notice.length<3||notice.length>1500||!text.includes(' '))await chat(chatId,'Use /avisar seguido do texto (3 a 1500 caracteres). Para enviar, abra a Central web.');
    else{
      const announcement=await db('rpc/mc_create_announcement',{method:'POST',body:{p_text:notice}});
      await chat(chatId,'📣 Aviso #'+announcement+' registrado. Para disparar os lotes, use a Central web.\nhttps://mandracke.vercel.app/admin/central');
    }
   }else if(command==='recharge'&&text.trim().split(/\s+/).length>1){
    await recharge(chatId,id,Number(text.trim().split(/\s+/)[1]));
   }else if(command==='name'&&text.trim().length>5){
    await updateName(chatId,id,text.trim().slice(5));
   }else if(command){
    await mainAction(command,chatId,id,from);
   }else if(msg?.reply_to_message?.from?.is_bot){
    const prompt=String(msg.reply_to_message.text||'');
    if(prompt.startsWith('✏️ ATUALIZAR NOME'))await updateName(chatId,id,msg.text);
    else if(prompt.startsWith('🖼 ATUALIZAR FOTO'))await updatePhoto(chatId,id,msg.photo);
    else await intro(chatId,from?.first_name);
   }else{
    if(!await getUser(id)){await issueKey(chatId,id,from)}
    else{
      const body=String(msg.text||'').trim().slice(0,2000);
      if(body){
       await db('mc_inbox',{method:'POST',body:{telegram_id:id,message_text:body},prefer:'return=minimal'});
       if(process.env.ADMIN_TELEGRAM_ID && String(id)!==process.env.ADMIN_TELEGRAM_ID){
        try{await chat(process.env.ADMIN_TELEGRAM_ID,'📨 NOVA MENSAGEM NA CENTRAL\n\nTelegram ID: '+id+'\n'+body.slice(0,1000)+'\n\nResponda com: /responder '+id+' SUA_RESPOSTA')}catch(e){console.warn('Admin notification delivery failed')}
       }
       await chat(chatId,'📨 Sua mensagem foi recebida pela central. O administrador poderá visualizá-la no painel. Para consultar os recursos, use /start.');
      }else await intro(chatId,from?.first_name);
    }
   }
  }
 }catch(e){
  console.error('Telegram webhook action failed',String(e));
  try{await chat(chatId,'Não foi possível executar esta ação. Tente novamente ou chame o suporte: '+SUPPORT)}catch{}
  return NextResponse.json({error:'Temporary processing error'},{status:500});
 }
 return NextResponse.json({ok:true});
}
