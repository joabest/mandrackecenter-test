# MANDRACKE CENTER — Telegram, keys e créditos

## Status
O código está no GitHub, mas a integração só funciona depois da configuração do Supabase e do webhook.

## Regras
- Login por key permanente, associada a um Telegram ID.
- Um novo /start cria outra key e revoga a anterior.
- Administrador controla planos FREE, PRO, PREMIUM, crédito, acesso e revogação.
- Promoção: primeira ativação pelo Telegram até 20/11/2026 às 23h59 (America/Sao_Paulo) concede PRO por sete dias; depois retorna ao FREE, salvo plano administrativo.
- O benefício de lançamento é concedido somente na primeira ativação.
- Recargas são solicitações pendentes, sem pagamento automático.

## 1. Supabase
1. Crie um projeto em https://supabase.com/dashboard.
2. No SQL Editor, execute supabase/schema.sql.
3. Execute supabase/002-permanent-keys-plans.sql para as keys permanentes, planos e promoção.
4. Configure na Vercel SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Nunca publique a chave service_role.

## 2. Telegram
1. Em @BotFather, use /mybots e selecione o bot.
2. Revogue qualquer token compartilhado e gere outro com API Token.
3. Configure na Vercel TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET (aleatório, mínimo 16 caracteres) e CENTRAL_GROUP_URL.
4. Faça Redeploy na Vercel.
5. Registre o webhook da Telegram Bot API setWebhook com URL https://painel-beige-tau.vercel.app/api/telegram/webhook e secret_token igual a TELEGRAM_WEBHOOK_SECRET.
6. Opcionalmente use scripts/setup-telegram-webhook.mjs com SITE_URL, TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET definidos localmente.
7. Abra https://t.me/mandrackecenterkeybot, envie /start, copie a key e faça login.
8. Confira usuários, planos, créditos e solicitações no painel administrativo.

## Segurança
- A key não expira, mas pode ser revogada.
- Cookies de membro duram 8 horas; revogar a key impede novo login, mas não encerra automaticamente uma sessão já aberta.
- As tabelas possuem RLS; o backend usa service_role.
- O webhook exige o header X-Telegram-Bot-Api-Secret-Token.
- Configure limite de tentativas/WAF para autenticação antes de abrir a usuários externos.
