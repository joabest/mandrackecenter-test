import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {validSession} from '../../../../lib/auth';
import {verifyMember} from '../../../../lib/member-session';
import {db} from '../../../../lib/members';
export const runtime='nodejs';
async function account(){
 const jar=await cookies();
 if(await validSession(jar.get('mandracke_session')?.value,process.env.SESSION_SECRET))return 'admin:primary';
 const s=await verifyMember(jar.get('mandracke_member')?.value,process.env.SESSION_SECRET);
 if(!s)return null;
 const u=await db('mc_users?telegram_id=eq.'+s.id+'&select=enabled,session_version');
 if(u.length!==1||!u[0].enabled||Number(u[0].session_version)!==s.version)return null;
 return 'telegram:'+s.id;
}
const err=(message,status)=>NextResponse.json({error:message},{status});
export async function GET(){
 try{
  const id=await account();if(!id)return err('Não autorizado',401);
  const p=await db('mc_ui_preferences?account_id=eq.'+encodeURIComponent(id)+'&select=preferences');
  return NextResponse.json({preferences:p[0]?.preferences||{}},{headers:{'Cache-Control':'private,no-store'}});
 }catch(e){console.error('UI preferences GET',String(e));return err('Não foi possível carregar preferências',503)}
}
export async function PUT(req){
 try{
  const id=await account();if(!id)return err('Não autorizado',401);
  const raw=await req.text();if(raw.length>18000)return err('Preferências muito grandes',413);
  const {preferences}=JSON.parse(raw);
  if(!preferences||typeof preferences!=='object'||Array.isArray(preferences))return err('Preferências inválidas',400);
  const allowed=['legacy_sidebar','admin_sidebar','member_sidebar'];
  if(Object.keys(preferences).some(k=>!allowed.includes(k)))return err('Preferência desconhecida',400);
  for(const value of Object.values(preferences)){
   if(!value||typeof value!=='object'||Array.isArray(value))return err('Preferência inválida',400);
  }
  const previous=await db('mc_ui_preferences?account_id=eq.'+encodeURIComponent(id)+'&select=preferences');
  const merged={...(previous[0]?.preferences||{}),...preferences};
  await db('mc_ui_preferences',{method:'POST',body:{account_id:id,preferences:merged,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates,return=minimal'});
  return NextResponse.json({ok:true});
 }catch(e){console.error('UI preferences PUT',String(e));return err('Falha ao salvar preferências',503)}
}
