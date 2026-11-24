export async function signSession(secret, exp) {
 const data = String(exp);
 const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data));
 const hex=Array.from(new Uint8Array(sig),b=>b.toString(16).padStart(2,'0')).join('');
 return data+'.'+hex;
}
export async function validSession(token,secret) {
 if(!secret||!token||!/^\d+\.[a-f0-9]{64}$/.test(token)) return false;
 const [e]=token.split('.');
 if(Number(e)<Date.now())return false;
 const expected=await signSession(secret,e);
 let a=0;for(let i=0;i<expected.length;i++)a|=expected.charCodeAt(i)^token.charCodeAt(i);
 return a===0;
}
