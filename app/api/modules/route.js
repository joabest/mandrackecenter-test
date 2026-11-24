import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verifyMember} from '../../../lib/member-session';
import {modules} from '../../../lib/modules';
import {moduleAccess} from '../../../lib/access-policy.mjs';
import {db} from '../../../lib/members';

export const runtime='nodejs';

export async function GET(){
 const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
 if(!session)return NextResponse.json({error:'Não autenticado'},{status:401});
 try{
  const [users,settings]=await Promise.all([
   db('mc_users?telegram_id=eq.'+session.id+'&select=telegram_id,enabled,credits,session_version'),
   db('mc_module_settings?select=module_id,enabled,off_message')
  ]);
  const user=users[0];
  if(!user||user.enabled!==true||Number(user.session_version)!==session.version)return NextResponse.json({error:'Sessão inválida'},{status:401});
  const admin=Boolean(process.env.ADMIN_TELEGRAM_ID)&&String(session.id)===process.env.ADMIN_TELEGRAM_ID;
  const balance=Number(user.credits||0);
  const byId=new Map(settings.map(m=>[m.module_id,m]));
  const result=modules.map(m=>{
   const flag=byId.get(m.id);
   const enabled=flag ? flag.enabled===true : true;
   const access=moduleAccess({moduleId:m.id,enabled,credits:balance,isAdmin:admin});
   return {...m,enabled,off_message:flag?.off_message||'Esta função está temporariamente indisponível.',access};
  });
  return NextResponse.json({modules:result,credits:balance,is_admin:admin},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){console.error('Module catalogue unavailable',String(e));return NextResponse.json({error:'Não foi possível consultar módulos'},{status:503})}
}
