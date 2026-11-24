import {NextResponse} from 'next/server';
import {validSession} from './lib/auth';
import {verifyMember} from './lib/member-session';

async function verifiedTelegramAdmin(req,secret){
 const session=await verifyMember(req.cookies.get('mandracke_member')?.value,secret);
 if(!session)return {session:null,memberOK:false,telegramAdmin:false};
 const url=process.env.SUPABASE_URL,token=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!token)return {session,memberOK:false,telegramAdmin:false};
 try{
  const headers={apikey:token,...(!token.startsWith('sb_secret_')?{Authorization:'Bearer '+token}:{})};
  const res=await fetch(url.replace(/\/$/,'')+'/rest/v1/mc_users?telegram_id=eq.'+session.id+'&select=session_version,enabled',{headers,cache:'no-store'});
  if(!res.ok)return {session,memberOK:false,telegramAdmin:false};
  const rows=await res.json();
  const active=rows.length===1&&rows[0].enabled===true&&Number(rows[0].session_version)===session.version;
  let memberOK=false;
  if(active){const keys=await fetch(url.replace(/\/$/,'')+'/rest/v1/mc_login_keys?telegram_id=eq.'+session.id+'&revoked_at=is.null&select=id&limit=1',{headers,cache:'no-store'});memberOK=keys.ok&&(await keys.json()).length>0;}
  // Never trust a username, URL parameter, or unverified Telegram ID for administrator access.
  const telegramAdmin=memberOK&&Boolean(process.env.ADMIN_TELEGRAM_ID)&&session.id===process.env.ADMIN_TELEGRAM_ID;
  return {session,memberOK,telegramAdmin};
 }catch(e){console.error('Member authorization check failed');return {session,memberOK:false,telegramAdmin:false}}
}

export async function middleware(req){
 const path=req.nextUrl.pathname;
 if(path==='/api/login'||path==='/api/public-config'||path==='/api/telegram/webhook'||path==='/api/member/telegram-auth'||path==='/api/member/browser-ticket'||path==='/manifest.webmanifest'||path==='/mandracke-icon.svg'||path==='/favicon.ico'||path.startsWith('/_next/'))return NextResponse.next();

 const secret=process.env.SESSION_SECRET;
 if(path==='/maintenance'||path==='/telegram'||path==='/entrar')return NextResponse.next();
 // A Telegram member session always takes precedence over a leftover password-admin cookie.
 // A different Telegram account must never inherit administrative access from this browser.
 const hasMemberCookie=Boolean(req.cookies.get('mandracke_member')?.value);
 const {session,memberOK,telegramAdmin}=hasMemberCookie?await verifiedTelegramAdmin(req,secret):{session:null,memberOK:false,telegramAdmin:false};
 const passwordAdmin=hasMemberCookie?false:await validSession(req.cookies.get('mandracke_session')?.value,secret);
 const admin=passwordAdmin||telegramAdmin;
 
 if(!admin && !(path==='/login'&&req.nextUrl.searchParams.get('admin')==='1')){
  try{
   const api=process.env.SUPABASE_URL,token=process.env.SUPABASE_SERVICE_ROLE_KEY;
   if(api&&token){
    const headers={apikey:token,...(!token.startsWith('sb_secret_')?{Authorization:'Bearer '+token}:{})};
    const response=await fetch(api.replace(/\/$/,'')+'/rest/v1/mc_settings?key=eq.maintenance&select=value',{headers,cache:'no-store'});
    if(response.ok){
     const rows=await response.json();
     if(rows[0]?.value?.enabled===true){
      if(path.startsWith('/api/'))return NextResponse.json({error:'Sistema em manutenção'},{status:503,headers:{'Retry-After':'300'}});
      return NextResponse.rewrite(new URL('/maintenance',req.url),{status:503});
     }
    }
   }
  }catch(e){console.error('Maintenance status unavailable')}
 }
 if(admin)return NextResponse.next();
 if(path==='/login'||path==='/api/member/login')return NextResponse.next();
 if(memberOK&&(path==='/member'||path.startsWith('/member/')||path.startsWith('/api/member/')||path==='/api/keys'||path==='/api/modules'||path==='/api/ui/preferences'||path==='/api/store'||path==='/member/store'||path==='/api/member/notifications'||path==='/api/member/profile'||path==='/member/notifications'))return NextResponse.next();
 if(path.startsWith('/api/'))return NextResponse.json({error:'Não autorizado'},{status:401});
 return NextResponse.redirect(new URL(memberOK?'/member':'/login',req.url));
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};
