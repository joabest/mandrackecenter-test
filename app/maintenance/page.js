import {db} from '../../lib/members';
export const dynamic='force-dynamic';
export const metadata={title:'Manutenção | MANDRACKE CENTER'};
export default async function Maintenance(){
 let notice='Estamos realizando melhorias na plataforma. Tente novamente em breve.';
 try{const rows=await db('mc_settings?key=eq.maintenance&select=value');if(rows[0]?.value?.message)notice=String(rows[0].value.message).slice(0,350)}catch{}
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#0c0915',color:'#f3eafd'}}>
  <section style={{maxWidth:580,textAlign:'center',border:'1px solid #423058',padding:42,borderRadius:22,background:'#171024'}}>
   <div style={{fontSize:48,color:'#aa83ea'}}>⬡</div>
   <h1>MANDRACKE CENTER</h1>
   <h2 style={{fontSize:22}}>Estamos em manutenção</h2>
   <p>{notice}</p>
   <a href="https://t.me/mandracke" style={{color:'#c8a8ff'}}>Falar com suporte</a>
  </section>
 </main>;
}
