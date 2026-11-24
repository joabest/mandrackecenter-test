import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verifyMember} from '../../../../lib/member-session';
import {db} from '../../../../lib/members';
export const runtime='nodejs';
export async function POST(req){
 const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
 const id=session?.id;
 if(!id)return NextResponse.json({error:'Não autenticado'},{status:401});
 let credits;try{({credits}=await req.json())}catch{}
 if(!Number.isSafeInteger(credits)||credits<1||credits>100000)return NextResponse.json({error:'Quantidade inválida'},{status:400});
 try{
  const flags=await db('mc_module_settings?module_id=eq.credits&select=enabled,off_message');
  if(flags[0]?.enabled===false)return NextResponse.json({error:flags[0].off_message||'Recargas temporariamente indisponíveis',module_off:true},{status:503});
  await db('mc_recharges',{method:'POST',body:{telegram_id:id,credits_requested:credits,status:'pending'},prefer:'return=minimal'});
  return NextResponse.json({ok:true,message:'Solicitação registrada. Créditos só entram após aprovação administrativa.'});
 }catch(e){console.error('Recharge',String(e));return NextResponse.json({error:'Não foi possível registrar'},{status:503})}
}
