import {NextResponse} from 'next/server';
import {db} from '../../../../lib/members';
export const runtime='nodejs';
const fail=(error,status=400)=>NextResponse.json({error},{status});
export async function GET(){
 try{
  const [settings,users,requests,inbox,announcements,usage]=await Promise.all([
   db('mc_settings?key=eq.maintenance&select=value'),
   db('mc_users?select=telegram_id,username,first_name,plan,credits,enabled,promo_pro_until,announcements_enabled,last_bot_seen_at&limit=1000'),
   db('mc_recharges?select=id,telegram_id,credits_requested,status,created_at&limit=1000'),
   db('mc_inbox?select=id,telegram_id,message_text,created_at,answered_at&order=created_at.desc&limit=80'),
   db('mc_announcements?select=id,message_text,created_at&order=created_at.desc&limit=15'),
   db('mc_usage_events?select=telegram_id,event_type,created_at&order=created_at.desc&limit=1000')
  ]);
  const now=Date.now(),day=now-86400000;
  const plans={FREE:0,PRO:0,PREMIUM:0};
  for(const u of users){const p=u.plan==='FREE'&&u.promo_pro_until&&Date.parse(u.promo_pro_until)>now?'PRO':u.plan;if(p in plans)plans[p]++}
  const ranking=users.slice().sort((a,b)=>Number(b.credits||0)-Number(a.credits||0)).slice(0,10).map(u=>({telegram_id:String(u.telegram_id),username:u.username,credits:Number(u.credits),plan:u.plan}));
  const usage24=usage.filter(e=>Date.parse(e.created_at)>=day);
  const byUser=new Map();
  for(const e of usage){const key=String(e.telegram_id||'');if(key)byUser.set(key,(byUser.get(key)||0)+1)}
  const activityRanking=[...byUser.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,count])=>({telegram_id:id,count}));
  const pending=requests.filter(r=>r.status==='pending').length;
  const approved=requests.filter(r=>r.status==='approved').length;
  return NextResponse.json({maintenance:settings[0]?.value||{enabled:false},plans,users:users.length,optedIn:users.filter(x=>x.announcements_enabled&&x.last_bot_seen_at).length,pending,approvedRequests:approved,creditsRequested:requests.reduce((n,r)=>n+Number(r.credits_requested||0),0),revenue:null,revenueNote:'Faturamento indisponível: não há integração com pagamentos confirmados. Créditos solicitados não representam receita.',activity24h:usage24.length,activityTotalSampled:usage.length,activityNote:'Somente eventos agregados autorizados; sem dados de cartões. Histórico limitado às últimas 1000 linhas.',ranking,activityRanking,inbox,announcements},{headers:{'Cache-Control':'private,no-store'}});
 }catch(e){console.error('Central admin GET',String(e));return fail('Não foi possível consultar a central',503)}
}
export async function PATCH(req){
 let data;try{data=await req.json()}catch{return fail('JSON inválido')}
 if(data?.action!=='maintenance'||typeof data.enabled!=='boolean'||typeof data.message!=='string'||data.message.length>350||data.message.length<8)return fail('Configuração de manutenção inválida');
 try{
  await db('mc_settings?key=eq.maintenance',{method:'PATCH',body:{value:{enabled:data.enabled,message:data.message}},prefer:'return=minimal'});
  return NextResponse.json({ok:true});
 }catch(e){console.error('Central maintenance',String(e));return fail('Falha ao salvar manutenção',503)}
}
export async function POST(req){
 let data;try{data=await req.json()}catch{return fail('JSON inválido')}
 if(data?.action!=='announcement'||typeof data.text!=='string'||data.text.trim().length<3||data.text.length>1500)return fail('Aviso inválido');
 try{
  const id=await db('rpc/mc_create_announcement',{method:'POST',body:{p_text:data.text.trim()}});
  return NextResponse.json({ok:true,id});
 }catch(e){console.error('Central announcement',String(e));return fail('Falha ao registrar aviso',503)}
}
