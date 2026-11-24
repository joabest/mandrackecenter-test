import {NextResponse} from 'next/server';
import {signSession} from '../../../lib/auth';
export const runtime='nodejs';
export async function POST(req) {
 const configured=process.env.ADMIN_PASSWORD, secret=process.env.SESSION_SECRET;
 if(!configured||!secret||configured.length<12||secret.length<32)return NextResponse.json({error:'Configure ADMIN_PASSWORD (mín. 12 caracteres) e SESSION_SECRET (mín. 32) na Vercel.'},{status:503});
 let body;try{body=await req.json()}catch{return NextResponse.json({error:'Dados inválidos'},{status:400})}
 const actual=String(body.password||'');
 const {timingSafeEqual,createHash}=await import('node:crypto');
 const dig=s=>createHash('sha256').update(s).digest();
 if(!timingSafeEqual(dig(actual),dig(configured)))return NextResponse.json({error:'Senha incorreta'},{status:401});
 const res=NextResponse.json({ok:true});
 res.cookies.set('mandracke_member','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
 res.cookies.set('mandracke_source','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
 res.cookies.set('mandracke_session',await signSession(secret,Date.now()+8*60*60*1000),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*60*60});
 return res;
}
