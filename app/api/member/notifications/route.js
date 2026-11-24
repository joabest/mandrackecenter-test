import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verifyMember} from '../../../../lib/member-session';
import {db} from '../../../../lib/members';
export const runtime='nodejs';
async function identity(){
 const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
 if(!session)return null;
 const users=await db('mc_users?telegram_id=eq.'+session.id+'&select=enabled,session_version');
 return users.length===1&&users[0].enabled===true&&Number(users[0].session_version)===session.version?session.id:null;
}
export async function GET(){
 try{const id=await identity();if(!id)return NextResponse.json({error:'Não autorizado'},{status:401});
 const notifications=await db('mc_notifications?telegram_id=eq.'+id+'&select=id,title,message,kind,created_at,read_at&order=created_at.desc&limit=100');
 return NextResponse.json({notifications,unread:notifications.filter(x=>!x.read_at).length},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível carregar notificações'},{status:503})}
}
export async function PATCH(req){
 try{const id=await identity();if(!id)return NextResponse.json({error:'Não autorizado'},{status:401});
 const b=await req.json(),notificationId=Number(b.id);
 if(!Number.isSafeInteger(notificationId)||notificationId<1)return NextResponse.json({error:'ID inválido'},{status:400});
 await db('mc_notifications?id=eq.'+notificationId+'&telegram_id=eq.'+id,{method:'PATCH',body:{read_at:new Date().toISOString()},prefer:'return=minimal'});
 return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Falha ao marcar leitura'},{status:503})}
}