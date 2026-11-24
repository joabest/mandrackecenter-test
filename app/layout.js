import './tailwind.css';
import './style.css';
export const metadata={
 title:{default:'MANDRACKE CENTER | Painel Administrativo',template:'%s | MANDRACKE CENTER'},
 description:'Painel administrativo protegido do MANDRACKE CENTER',
 applicationName:'MANDRACKE CENTER',
 manifest:'/manifest.webmanifest',
 icons:{icon:[{url:'/mandracke-icon.svg',type:'image/svg+xml'}],shortcut:'/mandracke-icon.svg',apple:'/mandracke-icon.svg'},
 appleWebApp:{capable:true,title:'MANDRACKE',statusBarStyle:'black-translucent'},
 robots:{index:false,follow:false}
};
export const viewport={themeColor:'#0e0b18',width:'device-width',initialScale:1};
export default function RootLayout({children}){return <html lang="pt-BR"><body>{children}</body></html>}
