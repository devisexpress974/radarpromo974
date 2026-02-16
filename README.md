# RadarPromo974 — PRO V1 (Base solide)

## Déploiement
1) Déploie ce dossier sur Netlify (drag & drop ou Git)
2) Ajoute les variables Netlify (Environment):

- SHEETBEST_API_URL = https://api.sheetbest.com/sheets/2a7a739d-2248-484f-9496-df69117f7cb9
- RRD_SERVICES_URL = https://devisexpress974.netlify.app/
- PAYPAL_BOOST_24H_URL = https://www.paypal.com/ncp/payment/PJL5R2DKD7L2Y
- PAYPAL_BOOST_7D_URL = https://www.paypal.com/ncp/payment/UZQZGGDAMC6GJ
- PAYPAL_BOOST_NOTIFY_URL = https://www.paypal.com/ncp/payment/MXX9GR57UYAKN
- PUBLIC_SITE_URL = https://radarpromo974.netlify.app/
- ADMIN_PASSWORD = (ton mot de passe)

## Google Sheets (onglets à créer)
Le code attend des onglets (tabs) Sheetbest:

### RAD_PROMOS
Colonnes (minimum recommandé):
id, merchant_id, title, description, category, zone, store_name,
old_price, new_price, discount_percent,
is_container, is_urgent,
source_type, source_url, image_url,
start_date, end_date, created_at,
status, boosted_until,
views, clicks,
related_service,
deleted_at

### RAD_SETTINGS (optionnel mais conseillé)
id, moderation_mode
- id = SETTINGS
- moderation_mode = true (ou false)

### RAD_PAYMENTS
id, merchant_id, promo_id, plan, amount, currency, status, paypal_link_used, created_at

## Fonctionnement
- Public: /, /promos, /promo/:id
- Community: /publier -> écrit une ligne RAD_PROMOS (pending si modération)
- Admin: /admin -> valide pending (ADMIN_PASSWORD)
- Boost: /boost -> PayPal -> /paiement-success -> active boosted_until

⚠️ V1 : activation boost manuelle (pas de webhook PayPal). V2 ajoutera validation automatique.

## Test Sheetbest
Teste dans ton navigateur:
.../tabs/RAD_PROMOS
Si tu vois du JSON, c’est ok.
