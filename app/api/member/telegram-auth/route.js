import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {db,userCookie} from '../../../../lib/members';
export const runtime='nodejs';
export async function POST(req){
 let initData;
 try{({initData}=await req.json())}catch{return NextResponse.json({error:'Dados inválidos'},{status:400})}
 if(typeof initData!=='string'||initData.length<50||initData.length>12000)return NextResponse.json({error:'Dados do Telegram ausentes'},{status:400});
 const token=process.env.TELEGRAM_BOT_TOKEN,secret=process.env.SESSION_SECRET;
 if(!token||!secret||secret.length<32)return NextResponse.json({error:'Servidor sem configuração'},{status:503});
 try{
  const params=new URLSearchParams(initData),hash=params.get('hash')||'';
  if(!/^[a-f0-9]{64}$/i.test(hash))throw Error('HASH_MISSING');
  const stamp=Number(params.get('auth_date'));
  const now=Math.floor(Date.now()/1000);
  if(!Number.isSafeInteger(stamp)||stamp>now+60||stamp<now-600)throw Error('EXPIRED');
  const entries=[...params.entries()].filter(([k])=>k!=='hash'&&k!=='signature');
  if(entries.length<2||new Set(entries.map(([k])=>k)).size!==entries.length)throw Error('INVALID_DATA');
  const check=entries.sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
  const key=createHmac('sha256','WebAppData').update(token).digest();
  const digest=createHmac('sha256',key).update(check).digest();
  const supplied=Buffer.from(hash,'hex');
  if(supplied.length!==digest.length||!timingSafeEqual(supplied,digest))throw Error('BAD_SIGNATURE');
  const user=JSON.parse(params.get('user')||'null');
  if(!user||!Number.isSafeInteger(user.id)||user.id<=0)throw Error('BAD_USER');
  const rows=await db('mc_users?telegram_id=eq.'+user.id+'&select=telegram_id,enabled');
  const keys=await db('mc_login_keys?telegram_id=eq.'+user.id+'&revoked_at=is.null&select=id&limit=1');
  if(!rows.length||rows[0].enabled===false||!keys.length)return NextResponse.json({error:'Conta não ativada. Gere sua key no bot primeiro.'},{status:403});
  await db('rpc/mc_refresh_admin_allowance',{method:'POST',body:{p_telegram_id:user.id}});
  const cookie=await userCookie(user.id);
  try{await db('mc_usage_events',{method:'POST',body:{telegram_id:user.id,event_type:'member_login'},prefer:'return=minimal'})}catch{}
  const response=NextResponse.json({ok:true,source:'telegram_webapp',redirect:String(user.id)===process.env.ADMIN_TELEGRAM_ID?'/admin/dashboard':'/member'});
  response.cookies.set('mandracke_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
  response.cookies.set('mandracke_member',cookie,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:28800});
  response.cookies.set('mandracke_source','telegram_webapp',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:28800});
  return response;
 }catch(e){
  console.warn('Telegram WebApp auth rejected',String(e).slice(0,80));
  return NextResponse.json({error:'Não foi possível validar sua identidade pelo Telegram. Abra o site pelo botão do bot.'},{status:401});
 }
}
