export const modules=[
{id:'dashboard',name:'Dashboard',group:'Início'},
{id:'credits',name:'Recarregar créditos',group:'Início'},
{id:'users',name:'Usuários',group:'Administração'},
{id:'telegram',name:'Configurar Bot TG',group:'Administração'},
{id:'extractor',name:'Extrator',group:'Ferramentas'},
{id:'formatcc',name:'Formatar dados de teste',group:'Ferramentas'},
{id:'formatlogin',name:'Formatar login',group:'Ferramentas'},
{id:'bin',name:'BIN Lookup',group:'Ferramentas'},
{id:'ip',name:'IP Locator',group:'Ferramentas'},
{id:'geradorbr',name:'Gerador BR',group:'Ferramentas'},
{id:'geradorgg',name:'Gerador GG',group:'Ferramentas'},
{id:'zeroauth',name:'ZEROAUTH',group:'Checkers legados'},
{id:'preauth',name:'PREAUTH',group:'Checkers legados'},
{id:'zeroauthv2',name:'ZEROAUTH V2',group:'Checkers legados'},
{id:'amazon',name:'Amazon BR',group:'Checkers legados'},
{id:'drogasil',name:'DrogaSil',group:'Checkers legados'},
{id:'adyen',name:'Check Adyen',group:'Checkers legados'},
{id:'profile',name:'Meu perfil',group:'Conta'},
{id:'settings',name:'Configurações',group:'Conta'}
];
export const moduleIds=new Set(modules.map(m=>m.id));
