import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verifyMember} from '../../../../lib/member-session';
import {db} from '../../../../lib/members';
import {moduleIds} from '../../../../lib/modules';
export const runtime='nodejs';
export async function GET(){
  try{
    const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
    if(!session)return NextResponse.json({error:'Sessão inválida'},{status:401});
    const verified=await db('mc_users?telegram_id=eq.'+session.id+'&select=enabled,session_version');
    if(verified.length!==1||verified[0].enabled!==true||Number(verified[0].session_version)!==session.version)return NextResponse.json({error:'Sessão inválida'},{status:403});
    const rows=await db('mc_adyen_sessions?select=id,mode,active,reference,merchant_account,created_at,expires_at,test_card_data');
    return NextResponse.json({sessions:rows},{headers:{'Cache-Control':'private, no-store'}});
  }catch{e}{console.error('Admin Adyen sessions',String(e));return NextResponse.json({error:'Falha ao carregar sessões'},{status:503})}
}
export async function POST(req){
  try{
    const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
    if(!session)return NextResponse.json({error:'Sessão inválida'},{status:401});
    const verified=await db('mc_users?telegram_id=eq.'+session.id+'&select=enabled,session_version');
    if(verified.length!==1||verified[0].enabled!==true||Number(verified[0].session_version)!==session.version)return NextResponse.json({error:'Sessão inválida'},{status:403});
    let payload;try{payload=await req.json()}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
    const {mode='TEST',reference,merchantAccount}=payload||{};
    if(typeof mode!=='string'||!['TEST','LIVE'].includes(mode))return NextResponse.json({error:'Modo inválido'},{status:400});
    if(typeof reference!=='string'||reference.trim().length<3||reference.length>120)return NextResponse.json({error:'Referência inválida'},{status:400});
    const mc=await db('mc_settings?key=eq=merchant_account&select=value');
    const defaultMAC=mc[0]?.value||'mandracke_test';
    const tcd=mode==='TEST'
      ?{pan:'4242424242424242',expiry:'12/30',cvv:'123',brand:'visa'}
      :{pan:'4242424242424242',expiry:'12/30',cvv:'123',brand:'visa'};
    const id=('adyen-'+Date.now()+Math.random().toString(36).slice(2,8)).toUpperCase();
    const sessionData={id,mode,active:true,reference:reference.trim(),merchantAccount:merchantAccount||defaultMAC,testCardData:tcd,created_at:new Date().toISOString()};
    await db('mc_adyen_sessions',{method:'POST',body:sessionData,prefer:'return=representation'});
    return NextResponse.json({ok:true,session:sessionData},{headers:{'Cache-Control':'no-store'}});
  }catch{e}{console.error('Admin Adyen create',String(e));return NextResponse.json({error:'Falha ao criar sessão'},{status:503})}
}
export async function PATCH(req){
  try{
    const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
    if(!session)return NextResponse.json({error:'Sessão inválida'},{status:401});
    const verified=await db('mc_users?telegram_id=eq.'+session.id+'&select=enabled,session_version');
    if(verified.length!==1||verified[0].enabled!==true||Number(verified[0].session_version)!==session.version)return NextResponse.json({error:'Sessão inválida'},{status:403});
    let payload;try{payload=await req.json()}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
    const {id,enabled,off_message}=payload||{};
    if(!id||typeof enabled!=='boolean'||typeof off_message!=='string'||off_message.trim().length<6||off_message.length>280)return NextResponse.json({error:'Estado ou aviso inválido'},{status:400});
    await db('mc_adyen_sessions?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:{enabled,off_message:off_message.trim(),updated_at:new Date().toISOString()},prefer:'return=minimal'});
    return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  }catch{e}{console.error('Admin Adyen patch',String(e));return NextResponse.json({error:'Falha ao atualizar sessão'},{status:503})}
}