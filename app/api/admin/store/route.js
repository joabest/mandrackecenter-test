import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {validSession} from '../../../../lib/auth';
import {verifyMember} from '../../../../lib/member-session';
import {db} from '../../../../lib/members';
export const runtime='nodejs';
async function admin(){
 const jar=await cookies(),secret=process.env.SESSION_SECRET;
 const member=await verifyMember(jar.get('mandracke_member')?.value,secret);
 if(member){
  if(!process.env.ADMIN_TELEGRAM_ID||String(member.id)!==String(process.env.ADMIN_TELEGRAM_ID))return false;
  const u=await db('mc_users?telegram_id=eq.'+member.id+'&select=enabled,session_version');
  return u.length===1&&u[0].enabled===true&&Number(u[0].session_version)===member.version;
 }
 return validSession(jar.get('mandracke_session')?.value,secret);
}
export async function GET(){
 try{if(!await admin())return NextResponse.json({error:'Acesso restrito'},{status:403});
 const [products,orders]=await Promise.all([db('mc_store_products?select=*&order=created_at.desc'),db('mc_store_orders?select=*&order=created_at.desc&limit=100')]);
 return NextResponse.json({products,orders},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Falha ao carregar a loja'},{status:503})}
}
export async function POST(req){
 try{
  if(!await admin())return NextResponse.json({error:'Acesso restrito'},{status:403});
  const b=await req.json();
  const title=typeof b.title==='string'?b.title.trim():'',category=typeof b.category==='string'?b.category.trim():'';
  const description=typeof b.description==='string'?b.description.trim():'';
  const icon=typeof b.icon==='string'?b.icon.trim():'package';
  const price_cents=Number(b.price_cents),stock=Number(b.stock);
  if(title.length<2||title.length>120||category.length<2||category.length>60||description.length>1000||!['package','mail','megaphone','film','gamepad','shopping-bag','globe','key-round'].includes(icon)||!Number.isSafeInteger(price_cents)||price_cents<1||price_cents>100000000||!Number.isSafeInteger(stock)||stock<0||stock>100000)return NextResponse.json({error:'Dados inválidos'},{status:400});
  const rows=await db('mc_store_products',{method:'POST',body:{title,category,description,icon,price_cents,stock,active:b.active===true},prefer:'return=representation'});
  return NextResponse.json({product:rows[0]},{status:201});
 }catch{return NextResponse.json({error:'Não foi possível cadastrar o produto'},{status:503})}
}
export async function PATCH(req){
 try{
  if(!await admin())return NextResponse.json({error:'Acesso restrito'},{status:403});
  const b=await req.json(),id=Number(b.id);
  if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:'ID inválido'},{status:400});
  if(b.action==='visibility'){
   if(typeof b.active!=='boolean')return NextResponse.json({error:'Estado inválido'},{status:400});
   await db('mc_store_products?id=eq.'+id,{method:'PATCH',body:{active:b.active},prefer:'return=minimal'});
  }else if(b.action==='stock'){
   const stock=Number(b.stock);
   if(!Number.isSafeInteger(stock)||stock<0||stock>100000)return NextResponse.json({error:'Estoque inválido'},{status:400});
   await db('mc_store_products?id=eq.'+id,{method:'PATCH',body:{stock},prefer:'return=minimal'});
  }else if(b.action==='order'){
   if(!['paid','canceled'].includes(b.status))return NextResponse.json({error:'Status inválido'},{status:400});
   const rows=await db('mc_store_orders?id=eq.'+id+'&status=eq.pending&select=id,product_id');
   if(!rows.length)return NextResponse.json({error:'Pedido não está pendente'},{status:409});
   const note=typeof b.fulfillment_note==='string'?b.fulfillment_note.trim():'';
   if(note.length>1000)return NextResponse.json({error:'Entrega muito longa'},{status:400});
   if(b.status==='paid'&&!note)return NextResponse.json({error:'Informe o comprovante da entrega autorizada (sem senhas)'},{status:400});
   await db('mc_store_orders?id=eq.'+id+'&status=eq.pending',{method:'PATCH',body:{status:b.status,fulfillment_note:b.status==='paid'?note:null,paid_at:b.status==='paid'?new Date().toISOString():null},prefer:'return=minimal'});
   if(b.status==='paid'){
    const product=(await db('mc_store_products?id=eq.'+rows[0].product_id+'&select=stock'))[0];
    if(product&&product.stock>0)await db('mc_store_products?id=eq.'+rows[0].product_id,{method:'PATCH',body:{stock:product.stock-1},prefer:'return=minimal'});
   }
  }else return NextResponse.json({error:'Ação inválida'},{status:400});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Erro ao salvar alteração'},{status:503})}
}
