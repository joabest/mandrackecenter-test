import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {verifyMember} from '../../lib/member-session';
import {validSession} from '../../lib/auth';
import {db} from '../../lib/members';

export const runtime='nodejs';
export async function GET(){
 const jar=await cookies();
 const secret=process.env.SESSION_SECRET;
 const admin=await validSession(jar.get('mandracke_session')?.value,secret);
 if(!admin){
  const session=await verifyMember(jar.get('mandracke_member')?.value,secret);
  if(!session)return NextResponse.redirect(new URL('/login',process.env.NEXT_PUBLIC_SITE_URL||'https://mandracke.vercel.app'));
  let user;
  try{
   const found=await db('mc_users?telegram_id=eq.'+session.id+'&select=credits,enabled,session_version');
   user=found[0];
  }catch(e){
   console.error('Panel authorization lookup failed',String(e));
   return NextResponse.json({error:'Não foi possível verificar seu saldo'},{status:503});
  }
  if(!user||user.enabled!==true||Number(user.session_version)!==session.version)return NextResponse.redirect(new URL('/login',process.env.NEXT_PUBLIC_SITE_URL||'https://mandracke.vercel.app'));
  if(Number(user.credits)<=0)return NextResponse.redirect(new URL('/member?recharge=1',process.env.NEXT_PUBLIC_SITE_URL||'https://mandracke.vercel.app'));
 }
 const html=await readFile(join(process.cwd(),'legacy','mandracke.html'),'utf-8');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
