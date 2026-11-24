import {NextResponse} from 'next/server';
import {db,hashKey,userCookie} from '../../../../lib/members';
export const runtime='nodejs';
export async function POST(req){
 let key;try{({key}=await req.json())}catch{return NextResponse.json({error:'Formato inválido'},{status:400})}
 if(typeof key!=='string'||!/^[-_A-Za-z0-9]{20,100}$/.test(key))return NextResponse.json({error:'Key inválida'},{status:400});
 if(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)return NextResponse.json({error:'Servidor não configurado'},{status:503});
 try{
  const out=await db('rpc/mc_lookup_key',{method:'POST',body:{p_hash:hashKey(key)}});
  if(!Array.isArray(out)||!out.length)return NextResponse.json({error:'Key inválida, revogada ou conta desativada.'},{status:401});
  const tid=String(out[0].telegram_id);
  if(!/^\d+$/.test(tid))throw Error('Invalid Telegram ID');
  try{await db('mc_usage_events',{method:'POST',body:{telegram_id:tid,event_type:'member_login'},prefer:'return=minimal'})}catch{};
  const isAdmin=Boolean(process.env.ADMIN_TELEGRAM_ID)&&tid===process.env.ADMIN_TELEGRAM_ID;
  const res=NextResponse.json({ok:true,plan:out[0].plan,is_admin:isAdmin,redirect:isAdmin?'/admin/dashboard':'/member'});
  res.cookies.set('mandracke_member',await userCookie(tid),{path:'/',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:28800});
  res.cookies.set('mandracke_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
  res.cookies.set('mandracke_source','telegram_key',{path:'/',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:28800});
  return res;
 }catch(e){console.error('Member login unavailable',String(e));return NextResponse.json({error:'Acesso por Telegram indisponível: confira Supabase e migrações.'},{status:503})}
}
