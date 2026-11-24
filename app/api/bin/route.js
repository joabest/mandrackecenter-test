import {NextResponse} from 'next/server';
export async function GET(req) {
 const bin=new URL(req.url).searchParams.get('bin')||'';
 if(!/^\d{6,8}$/.test(bin))return NextResponse.json({error:'Informe 6 a 8 dígitos do BIN'},{status:400});
 try {
  const response=await fetch('https://lookup.binlist.net/'+bin,{headers:{'Accept-Version':'3'},signal:AbortSignal.timeout(8500),next:{revalidate:86400}});
  if(response.status===429)return NextResponse.json({error:'Limite temporário de consultas atingido'},{status:429});
  if(!response.ok)return NextResponse.json({error:response.status===404?'BIN não encontrado':'Falha na API de BIN'},{status:response.status===404?404:502});
  const d=await response.json();
  return NextResponse.json({bin,bank:d.bank?.name||'Não informado',scheme:d.scheme||'Não informado',type:d.type||'Não informado',brand:d.brand||'Não informado',country:d.country?.name||'Não informado'},{headers:{'Cache-Control':'private, max-age=3600'}});
 } catch {return NextResponse.json({error:'API indisponível no momento'},{status:502})}
}
