import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verifyMember} from '../../../../lib/member-session';
import {db} from '../../../../lib/members';
import {moduleIds,modules} from '../../../../lib/modules';
export const runtime='nodejs';
export async function GET(){
 try{
  const rows=await db('mc_module_settings?select=module_id,enabled,off_message,updated_at');
  const map=new Map(rows.map(r=>[r.module_id,r]));
  return NextResponse.json({modules:modules.map(m=>({...m,...(map.get(m.id)||{enabled:true,off_message:'Esta função está temporariamente indisponível.'})}))},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){console.error('Admin modules',String(e));return NextResponse.json({error:'Falha ao carregar módulos'},{status:503})}
}
export async function PATCH(req){
 const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
 if(!process.env.ADMIN_TELEGRAM_ID||!session||String(session.id)!==String(process.env.ADMIN_TELEGRAM_ID))return NextResponse.json({error:'Apenas o proprietário da conta Telegram pode alterar módulos'},{status:403});
 const verified=await db('mc_users?telegram_id=eq.'+session.id+'&select=enabled,session_version');
 if(verified.length!==1||verified[0].enabled!==true||Number(verified[0].session_version)!==session.version)return NextResponse.json({error:'Sessão inválida'},{status:403});
 let payload;try{payload=await req.json()}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
 const {module_id,enabled,off_message}=payload||{};
 if(!moduleIds.has(module_id)||typeof enabled!=='boolean'||typeof off_message!=='string'||off_message.trim().length<6||off_message.length>280)return NextResponse.json({error:'Estado ou aviso inválido'},{status:400});
 try{
  await db('mc_module_settings?module_id=eq.'+encodeURIComponent(module_id),{method:'PATCH',body:{enabled,off_message:off_message.trim(),updated_at:new Date().toISOString()},prefer:'return=minimal'});
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Module save',String(e));return NextResponse.json({error:'Falha ao salvar módulo'},{status:503})}
}
