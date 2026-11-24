import {signSession} from './auth';
export async function verifyMember(token,secret){
 if(!secret||!token||!/^member:\d+:\d+:\d+\.[a-f0-9]{64}$/.test(token))return null;
 const dot=token.lastIndexOf('.'),body=token.slice(0,dot);
 const parts=body.split(':');
 if(Number(parts[2])<Date.now())return null;
 const expected=await signSession(secret,body);
 if(expected.length!==token.length)return null;
 let n=0;for(let i=0;i<token.length;i++)n|=expected.charCodeAt(i)^token.charCodeAt(i);
 return n===0?{id:parts[1],version:Number(parts[3])}:null;
}
