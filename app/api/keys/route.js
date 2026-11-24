import {NextResponse} from 'next/server';
import {cookies,headers} from 'next/headers';
import {validSession} from '../../../lib/auth';
import {verifyMember} from '../../../lib/member-session';
import {db} from '../../../lib/members';
export const runtime='nodejs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad=(error,status=400)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
async function actor(){
 const c=await cookies(),secret=process.env.SESSION_SECRET;
 const memberToken=c.get('mandracke_member')?.value;
 if(memberToken){
  const member=await verifyMember(memberToken,secret);
  if(!member)return null;
  const rows=await db('mc_users?telegram_id=eq.'+member.id+'&select=enabled,session_version');
  if(rows.length!==1||rows[0].enabled!==true||Number(rows[0].session_version)!==member.version)return null;
  return {id:member.id,admin:member.id===process.env.ADMIN_TELEGRAM_ID};
 }
 if(await validSession(c.get('mandracke_session')?.value,secret))return {id:'password-admin',admin:true};
 return null;
}
async function checkOrigin(req){
 const h=await headers(),origin=h.get('origin');
 return Boolean(origin)&&origin===new URL(req.url).origin;
}
export async function GET(req){
 try{
  const user=await actor();if(!user)return bad('Não autenticado',401);
  const url=new URL(req.url);
  const target=url.searchParams.get('user');
  if(target&&(!user.admin||!/^\d{1,20}$/.test(target)))return bad('Operação não permitida',403);
  const owner=target||(!user.admin||url.searchParams.get('scope')!=='all'?user.id:null);
  if(owner==='password-admin')return bad('Selecione um usuário ou todas as keys',400);
  const filter=owner?'telegram_id=eq.'+owner+'&':'';
  const keys=await db('mc_login_keys?'+filter+'select=id,telegram_id,created_at,revoked_at&order=created_at.desc&limit=500');
  const profile=owner?(await db('mc_users?telegram_id=eq.'+owner+'&select=key_generation_blocked'))[0]:null;
  return NextResponse.json({keys,admin:user.admin,scope:owner?'user':'all',key_generation_blocked:profile?.key_generation_blocked===true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Keys list',String(e));return bad('Erro ao consultar keys; confira a migração 009',503)}
}
export async function DELETE(req){
 try{
  if(!await checkOrigin(req))return bad('Origem inválida',403);
  const user=await actor();if(!user)return bad('Não autenticado',401);
  const b=await req.json().catch(()=>null);
  if(!b||b.confirm!=='DELETE KEY')return bad('Confirmação necessária');
  const owner=b.user==null?null:String(b.user);
  if(owner!==null&&!/^\d{1,20}$/.test(owner))return bad('Usuário inválido');
  if(owner!==null&&!user.admin&&owner!==user.id)return bad('Sem permissão',403);
  if(!user.admin&&b.all!==true&&!Array.isArray(b.ids))return bad('Seleção inválida');
  if(!user.admin&&b.all===true&&owner!==null&&owner!==user.id)return bad('Sem permissão',403);
  const effectiveOwner=owner??(user.admin?null:user.id);
  if(!user.admin&&effectiveOwner!==user.id)return bad('Sem permissão',403);
  if(user.admin&&owner===null&&b.all!==true&&b.scope!=='all')return bad('Selecione o escopo',400);
  if(user.admin&&owner===null&&b.all===true&&b.doubleConfirm!=='DESTRUIR TODAS')return bad('Confirmação dupla necessária');
  const actorName=user.id==='password-admin'?'admin:password':'telegram:'+user.id;
  const reason=typeof b.reason==='string'?b.reason.slice(0,250):'Solicitado no painel';
  let result;
  if(b.all===true){
   result=await db('rpc/mc_revoke_all_keys',{method:'POST',body:{p_owner:effectiveOwner,p_actor:actorName,p_reason:reason}});
  }else{
   if(!Array.isArray(b.ids)||b.ids.length<1||b.ids.length>100||b.ids.some(id=>typeof id!=='string'||!UUID.test(id)))return bad('Selecione entre 1 e 100 keys');
   result=await db('rpc/mc_revoke_keys',{method:'POST',body:{p_ids:[...new Set(b.ids)],p_owner:effectiveOwner,p_actor:actorName,p_reason:reason}});
  }
  const affected=b.all===true?Number(result||0):result.length;
  const targets=b.all===true?(effectiveOwner?[effectiveOwner]:[]):[...new Set(result.map(x=>String(x.telegram_id)))];
  const token=process.env.TELEGRAM_BOT_TOKEN;
  if(token&&targets.length&&user.admin){
   await Promise.allSettled(targets.slice(0,100).map(id=>fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:id,text:'🔒 Uma ou mais keys da sua conta foram revogadas pela administração. Para obter uma nova key, acesse o bot. Se a emissão estiver bloqueada, contate o suporte.'}),
    signal:AbortSignal.timeout(4500)
   })));
  }
  return NextResponse.json({ok:true,revoked:affected,notice:'Keys revogadas. Sessões anteriores invalidadas.'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Key revocation',String(e));return bad('Falha ao revogar keys; confira a migração 009.',503)}
}
export async function PATCH(req){
 try{
  if(!await checkOrigin(req))return bad('Origem inválida',403);
  const user=await actor();if(!user?.admin)return bad('Acesso administrativo necessário',403);
  const body=await req.json().catch(()=>null);
  if(!body||!/^\d{1,20}$/.test(String(body.user))||typeof body.blocked!=='boolean')return bad('Dados inválidos');
  await db('mc_users?telegram_id=eq.'+body.user,{method:'PATCH',body:{key_generation_blocked:body.blocked},prefer:'return=minimal'});
  return NextResponse.json({ok:true});
 }catch(e){console.error('Key block',String(e));return bad('Erro ao atualizar permissão',503)}
}
