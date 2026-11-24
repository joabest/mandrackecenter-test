import {createHash,randomBytes} from 'node:crypto';
import {signSession} from './auth';
import {effectivePlan} from './access-policy.mjs';
export function hashKey(value){return createHash('sha256').update(String(value)).digest('hex')}
export function generateKey(){return randomBytes(18).toString('base64url')}
function dbConfig(){
 const url=process.env.SUPABASE_URL,token=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!token)throw Error('SUPABASE_NOT_CONFIGURED');
 return {url:url.replace(/\/$/,''),token};
}
export async function db(path,{method='GET',body,prefer}={}){
 const {url,token}=dbConfig();
 const resp=await fetch(url+'/rest/v1/'+path,{
  method,headers:{apikey:token,...(!token.startsWith('sb_secret_')?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...(prefer?{Prefer:prefer}:{})},
  body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(10000)
 });
 const payload=await resp.text();let result;try{result=payload?JSON.parse(payload):null}catch{result=payload}
 if(!resp.ok)throw Error('SUPABASE_'+resp.status+': '+(typeof result==='object'?result?.message||result?.code:result));
 return result;
}
export async function userCookie(telegramId){
 const rows=await db('mc_users?telegram_id=eq.'+telegramId+'&select=session_version,enabled');
 const activeKeys=await db('mc_login_keys?telegram_id=eq.'+telegramId+'&revoked_at=is.null&select=id&limit=1');
 if(!rows?.length||rows[0].enabled===false||!activeKeys?.length)throw Error('ACCOUNT_DISABLED_OR_NO_KEY');
 const exp=Date.now()+8*60*60*1000;
 return signSession(process.env.SESSION_SECRET,'member:'+telegramId+':'+exp+':'+String(rows[0].session_version||0));
}
export function safeUser(row){return {telegram_id:String(row.telegram_id),username:row.username||'',first_name:row.first_name||'',credits:Number(row.credits||0),created_at:row.created_at,plan:row.plan||'FREE',effective_plan:effectivePlan(row),promo_eligible:row.plan==='FREE'&&Boolean(row.promo_pro_until)&&new Date(row.promo_pro_until)>new Date(),can_execute:Number(row.credits||0)>0&&row.enabled!==false,promo_pro_until:row.promo_pro_until||null,enabled:row.enabled!==false,has_photo:Boolean(row.photo_file_id),mc_tokens:Number(row.mc_tokens||0),admin_allowance_day:row.admin_allowance_day||null}}
