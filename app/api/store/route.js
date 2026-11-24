import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {verifyMember} from '../../../lib/member-session';
import {db} from '../../../lib/members';
export const runtime='nodejs';
async function currentUser(){
 const session=await verifyMember((await cookies()).get('mandracke_member')?.value,process.env.SESSION_SECRET);
 if(!session)return null;
 const rows=await db('mc_users?telegram_id=eq.'+session.id+'&select=telegram_id,enabled,session_version');
 return rows.length===1&&rows[0].enabled===true&&Number(rows[0].session_version)===session.version?String(session.id):null;
}
export async function GET(){
 try{
  const id=await currentUser();
  if(!id)return NextResponse.json({error:'Sessão inválida'},{status:401});
  const [products,orders]=await Promise.all([
   db('mc_store_products?active=eq.true&select=id,title,description,category,icon,price_cents,stock&order=created_at.desc'),
   db('mc_store_orders?telegram_id=eq.'+id+'&select=id,product_title,price_cents,status,fulfillment_note,created_at,paid_at&order=created_at.desc&limit=100')
  ]);
  return NextResponse.json({products,orders},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Loja indisponível'},{status:503})}
}
export async function POST(req){
 try{
  const id=await currentUser();if(!id)return NextResponse.json({error:'Sessão inválida'},{status:401});
  const payload=await req.json(),productId=Number(payload.product_id);
  if(!Number.isSafeInteger(productId)||productId<1)return NextResponse.json({error:'Produto inválido'},{status:400});
  const products=await db('mc_store_products?id=eq.'+productId+'&active=eq.true&select=id,title,price_cents,stock');
  const p=products[0];if(!p||p.stock<=0)return NextResponse.json({error:'Produto indisponível'},{status:409});
  const rows=await db('mc_store_orders',{method:'POST',body:{telegram_id:id,product_id:p.id,product_title:p.title,price_cents:p.price_cents},prefer:'return=representation'});
  return NextResponse.json({order:rows[0],message:'Pedido criado. Pagamento pendente de confirmação.'},{status:201});
 }catch{return NextResponse.json({error:'Não foi possível criar o pedido'},{status:503})}
}