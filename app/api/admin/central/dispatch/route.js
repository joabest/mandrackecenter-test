import {NextResponse} from 'next/server';
import {db} from '../../../../../lib/members';
export const runtime='nodejs';
export async function POST(req){
 let body;try{body=await req.json()}catch{}
 const id=Number(body?.id);
 if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:'Aviso inválido'},{status:400});
 try{
  const [messages,pending]=await Promise.all([
   db('mc_announcements?id=eq.'+id+'&select=message_text'),
   db('mc_announcement_deliveries?announcement_id=eq.'+id+'&state=eq.pending&select=telegram_id&limit=20')
  ]);
  if(!messages.length)return NextResponse.json({error:'Aviso não encontrado'},{status:404});
  let sent=0,failed=0;
  for(const user of pending){
   const tgId=String(user.telegram_id);
   let state='sent',error_code=null;
   try{
    const res=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({chat_id:tgId,text:'📢 AVISO MANDRACKE CENTER\n\n'+messages[0].message_text+'\n\nPara parar avisos: /pararavisos'}),
     signal:AbortSignal.timeout(7000)
    });
    const parsed=await res.json();
    if(!res.ok||!parsed.ok){state='failed';error_code=String(parsed.error_code||res.status);failed++}
    else sent++;
   }catch{state='failed';error_code='network';failed++}
   await db('mc_announcement_deliveries?announcement_id=eq.'+id+'&telegram_id=eq.'+tgId,{method:'PATCH',body:{state,error_code,sent_at:state==='sent'?new Date().toISOString():null},prefer:'return=minimal'});
  }
  const left=await db('mc_announcement_deliveries?announcement_id=eq.'+id+'&state=eq.pending&select=telegram_id&limit=1');
  return NextResponse.json({ok:true,sent,failed,remaining:!!left.length,processed:pending.length});
 }catch(e){console.error('Announcement dispatch',String(e));return NextResponse.json({error:'Não foi possível enviar lote'},{status:503})}
}
