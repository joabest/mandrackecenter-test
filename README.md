# MANDRACKE CENTER — BIN Lookup

Painel em Next.js com login administrativo protegido por cookie HttpOnly assinado por HMAC-SHA256 e endpoint server-side de consulta pública de BINs.

## Segurança

Na Vercel, configure as variáveis de ambiente **ADMIN_PASSWORD** (mínimo 12 caracteres) e **SESSION_SECRET** (segredo aleatório de pelo menos 32 caracteres), para os ambientes Production e Preview. Sem essas variáveis o sistema não permite autenticação.

Não adicione credenciais ao GitHub. A sessão expira em 8 horas. Dados do BIN são obtidos da API pública BINList e podem estar incompletos. Não há checker de cartões, verificação de cobrança ou bypass de autenticação.

## Desenvolvimento

```sh
npm install
npm run dev
```

Criado para deploy Vercel com framework Next.js. O primeiro deploy terá a tela de login bloqueada até que as variáveis de ambiente sejam definidas.
