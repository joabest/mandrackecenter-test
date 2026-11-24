import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verifyMember} from '../../../../lib/member-session';
import {db} from '../../../../lib/members';
export const runtime='nodejs';
export async function GET(){
 const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
 if(!session)return NextResponse.json({error:'Não autenticado'},{status:401});
 try{
  const rows=await db('mc_users?telegram_id=eq.'+session.id+'&select=photo_file_id,enabled');
  if(!rows?.length||rows[0].enabled===false||!rows[0].photo_file_id)return new Response(null,{status:404});
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const fileResponse=await fetch('https://api.telegram.org/bot'+token+'/getFile?file_id='+encodeURIComponent(rows[0].photo_file_id),{cache:'no-store'});
  const result=await fileResponse.json();
  if(!result.ok||!result.result?.file_path)return new Response(null,{status:404});
  const image=await fetch('https://api.telegram.org/file/bot'+token+'/'+result.result.file_path,{cache:'no-store'});
  if(!image.ok)return new Response(null,{status:502});
  const mime=image.headers.get('content-type')||'image/jpeg';
  if(!mime.startsWith('image/'))return new Response(null,{status:415});
  return new Response(image.body,{headers:{'Content-Type':mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){console.error('Profile photo unavailable',String(e));return new Response(null,{status:503})}
}
