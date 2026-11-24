import {NextResponse} from 'next/server';
import {db,hashKey,userCookie} from '../../../../lib/members';
export const runtime='nodejs';
export async function POST(req){
 let ticket;
 try{({ticket}=await req.json())}catch{return NextResponse.json({error:'Solicitação inválida'},{status:400})}
 if(typeof ticket!=='string'||!/^[-_A-Za-z0-9]{32,96}$/.test(ticket))return NextResponse.json({error:'Link inválido'},{status:400});
 try{
  const found=await db('rpc/mc_redeem_browser_ticket',{method:'POST',body:{p_hash:hashKey(ticket)}});
  if(!found?.length)return NextResponse.json({error:'Link expirado ou já utilizado. Solicite outro pelo bot.'},{status:401});
  const id=String(found[0].telegram_id);
  if(id===process.env.ADMIN_TELEGRAM_ID){
   await db('rpc/mc_refresh_admin_allowance',{method:'POST',body:{p_telegram_id:Number(id)}});
  }
  const cookie=await userCookie(id);
  const res=NextResponse.json({ok:true,redirect:id===process.env.ADMIN_TELEGRAM_ID?'/admin/dashboard':'/member'});
  const opts={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:28800};
  res.cookies.set('mandracke_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
  res.cookies.set('mandracke_member',cookie,opts);
  res.cookies.set('mandracke_source','telegram_browser',opts);
  return res;
 }catch(e){
  console.error('Browser ticket login error',String(e));
  return NextResponse.json({error:'Falha ao validar login; tente novamente pelo bot.'},{status:503});
 }
}
