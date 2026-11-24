import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verifyMember} from '../../../../lib/member-session';
import {db} from '../../../../lib/members';
export const runtime='nodejs';
export async function PATCH(req){
 try{
  const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
  if(!session)return NextResponse.json({error:'Sessão inválida'},{status:401});
  const rows=await db('mc_users?telegram_id=eq.'+session.id+'&select=enabled,session_version');
  if(rows.length!==1||rows[0].enabled!==true||Number(rows[0].session_version)!==session.version)return NextResponse.json({error:'Não autorizado'},{status:403});
  const body=await req.json();
  const first_name=typeof body.first_name==='string'?body.first_name.trim():'';
  if(first_name.length<2||first_name.length>80)return NextResponse.json({error:'Nome deve ter entre 2 e 80 caracteres'},{status:400});
  await db('mc_users?telegram_id=eq.'+session.id,{method:'PATCH',body:{first_name},prefer:'return=minimal'});
  return NextResponse.json({ok:true,first_name});
 }catch{return NextResponse.json({error:'Erro ao salvar perfil'},{status:503})}
}
