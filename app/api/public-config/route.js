import {NextResponse} from 'next/server';
export function GET(){
 const bot=process.env.TELEGRAM_BOT_USERNAME||'';
 const valid=/^[A-Za-z0-9_]{5,32}$/.test(bot);
 return NextResponse.json({bot:valid?bot:null,group:process.env.CENTRAL_GROUP_URL||null,support:'https://t.me/mandracke'},{headers:{'Cache-Control':'no-store'}});
}
