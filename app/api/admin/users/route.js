import {NextResponse} from 'next/server';
import {db,safeUser} from '../../../../lib/members';
export const runtime='nodejs';
export async function GET(){
 try{
  const [users,recharges]=await Promise.all([
   db('mc_users?select=telegram_id,username,first_name,credits,created_at,plan,promo_pro_until,enabled&order=created_at.desc&limit=500'),
   db('mc_recharges?select=id,telegram_id,credits_requested,status,created_at&order=created_at.desc&limit=100')
  ]);
  return NextResponse.json({users:users.map(safeUser),recharges},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Admin users',String(e));return NextResponse.json({error:'Configure o banco Supabase e execute o esquema SQL.'},{status:503})}
}
export async function PATCH(req){
 let body;try{body=await req.json()}catch{}
 if(!body||!['credit','approve','reject','plan','enabled','revoke_key'].includes(body.action))return NextResponse.json({error:'Ação inválida'},{status:400});
 try{
  if(['plan','enabled','revoke_key'].includes(body.action)){
   if(!/^\d+$/.test(String(body.telegram_id)))return NextResponse.json({error:'ID inválido'},{status:400});
   const rpc=body.action==='plan'?'mc_set_plan':body.action==='enabled'?'mc_set_user_enabled':'mc_revoke_user_key';
   if(body.action==='plan'&&!['FREE','PRO','PREMIUM'].includes(body.plan))return NextResponse.json({error:'Plano inválido'},{status:400});
   if(body.action==='enabled'&&typeof body.enabled!=='boolean')return NextResponse.json({error:'Estado inválido'},{status:400});
   const args=body.action==='plan'?{p_telegram_id:body.telegram_id,p_plan:body.plan}:body.action==='enabled'?{p_telegram_id:body.telegram_id,p_enabled:body.enabled}:{p_telegram_id:body.telegram_id};
   const out=await db('rpc/'+rpc,{method:'POST',body:args});return NextResponse.json({ok:true,result:out});
  }
  if(body.action==='credit'){
   if(!/^\d+$/.test(String(body.telegram_id))||!Number.isSafeInteger(body.delta)||Math.abs(body.delta)>100000||body.delta===0)return NextResponse.json({error:'Ajuste inválido'},{status:400});
   const out=await db('rpc/mc_adjust_credits',{method:'POST',body:{p_telegram_id:String(body.telegram_id),p_delta:body.delta}});
   return NextResponse.json({ok:true,result:out});
  }
  if(typeof body.recharge_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.recharge_id))return NextResponse.json({error:'Solicitação inválida'},{status:400});
  const out=await db('rpc/mc_review_recharge',{method:'POST',body:{p_recharge_id:body.recharge_id,p_approve:body.action==='approve'}});
  return NextResponse.json({ok:true,result:out});
 }catch(e){console.error('Admin adjust',String(e));return NextResponse.json({error:'Erro ao atualizar (confira dados e banco)'},{status:503})}
}
