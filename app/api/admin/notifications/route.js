import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verifyMember} from '../../../../lib/member-session';
import {validSession} from '../../../../lib/auth';
import {db} from '../../../../lib/members';
export const runtime='nodejs';
async function isAdmin(){
 const jar=await cookies(),secret=process.env.SESSION_SECRET,member=await verifyMember(jar.get('mandracke_member')?.value,secret);
 if(member){if(!process.env.ADMIN_TELEGRAM_ID||String(member.id)!==String(process.env.ADMIN_TELEGRAM_ID))return false;
 const rows=await db('mc_users?telegram_id=eq.'+member.id+'&select=enabled,session_version');
 return rows.length===1&&rows[0].enabled===true&&Number(rows[0].session_version)===member.version;}
 return validSession(jar.get('mandracke_session')?.value,secret);
}
export async function GET(){
 try{if(!await isAdmin())return NextResponse.json({error:'Admin obrigatório'},{status:403});
 const notifications=await db('mc_notifications?select=id,telegram_id,title,message,kind,created_at&order=created_at.desc&limit=100');
 return NextResponse.json({notifications},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Erro ao carregar avisos'},{status:503})}
}
export async function POST(req){
 try{if(!await isAdmin())return NextResponse.json({error:'Admin obrigatório'},{status:403});
 const b=await req.json(),title=typeof b.title==='string'?b.title.trim():'',message=typeof b.message==='string'?b.message.trim():'';
 if(title.length<1||title.length>100||message.length<1||message.length>1000||!['all','user','low_balance'].includes(b.target))return NextResponse.json({error:'Campos inválidos'},{status:400});
 const threshold=Number(b.threshold??10);
 if(b.target==='low_balance'&&(!Number.isSafeInteger(threshold)||threshold<0||threshold>100000))return NextResponse.json({error:'Limite de saldo inválido'},{status:400});
 const users=await db('mc_users?select=telegram_id,enabled,credits,announcements_enabled');
 const selected=users.filter(u=>u.enabled===true&&u.announcements_enabled!==false&&(b.target==='all'||(b.target==='user'&&String(u.telegram_id)===String(b.telegram_id))||(b.target==='low_balance'&&Number(u.credits)<=threshold)));
 if(!selected.length)return NextResponse.json({error:'Nenhum usuário elegível encontrado'},{status:404});
 if(selected.length>2000)return NextResponse.json({error:'Envio acima do limite permitido'},{status:400});
 const payload=selected.map(u=>({telegram_id:u.telegram_id,title,message,kind:b.target==='low_balance'?'balance':'general'}));
 await db('mc_notifications',{method:'POST',body:payload,prefer:'return=minimal'});
 return NextResponse.json({ok:true,recipients:selected.length},{status:201});
 }catch{return NextResponse.json({error:'Não foi possível publicar a notificação'},{status:503})}
}