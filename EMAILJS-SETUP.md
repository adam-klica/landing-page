# 📧 EmailJS Setup Guide

## Kako da dobiješ potrebne podatke iz EmailJS Dashboard-a

### 1. **Public Key (User ID)**
1. Idi na: https://dashboard.emailjs.com/admin/integration
2. Ili: Account → API Keys
3. Kopiraj **Public Key** (izgleda kao: `user_xxxxxxxxxxxxx`)

### 2. **Service ID**
1. Idi na: https://dashboard.emailjs.com/admin/service
2. Klikni na postojeći servis ili napravi novi
3. Kopiraj **Service ID** (izgleda kao: `service_xxxxxxxx`)

### 3. **Template ID**
1. Idi na: https://dashboard.emailjs.com/admin/template
2. Klikni na postojeći template ili napravi novi
3. Kopiraj **Template ID** (izgleda kao: `template_xxxxxxxx`)

## Kako da postaviš environment varijable

### Lokalno (`.env.local`):
```env
EMAILJS_PUBLIC_KEY=user_tvoj_public_key_ovde
EMAILJS_SERVICE_ID=service_tvoj_service_id_ovde
EMAILJS_TEMPLATE_ID=template_tvoj_template_id_ovde
```

### U produkciji (Hostinger/Vercel):

**Hostinger:**
1. Idi u Control Panel → Environment Variables
2. Dodaj tri nove varijable:
   - `EMAILJS_PUBLIC_KEY` = `user_...`
   - `EMAILJS_SERVICE_ID` = `service_...`
   - `EMAILJS_TEMPLATE_ID` = `template_...`
3. Restartuj aplikaciju

**Vercel:**
1. Idi u Project Settings → Environment Variables
2. Dodaj tri nove varijable za Production
3. Redeploy aplikaciju

## EmailJS Template Polja

Tvoj EmailJS template treba da koristi ova polja:

- `{{name}}` - Ime korisnika
- `{{email}}` - Email adresa
- `{{subject}}` - Naslov emaila
- `{{message}}` - Tekst poruke (plain text)
- `{{message_html}}` - HTML verzija poruke
- `{{to_email}}` - Primaoc emaila
- `{{reply_to}}` - Reply-to adresa

## Testiranje

Nakon što postaviš environment varijable:

1. **Proveri konfiguraciju:**
   ```
   https://yourdomain.com/api/email/test
   ```
   Trebalo bi da vidiš: `emailjs.configured: true`

2. **Testiraj kontakt formu:**
   - Pošalji poruku kroz kontakt formu
   - Proveri logove u produkciji da vidiš da li se email šalje

3. **Proveri EmailJS dashboard:**
   - Idi na: https://dashboard.emailjs.com/admin/logs
   - Videćeš sve pokušaje slanja emailova

## Troubleshooting

**Problem: EmailJS ne šalje emailove**
- Proveri da li su sve tri varijable postavljene
- Proveri da li template koristi pravilna polja
- Proveri EmailJS logs u dashboard-u
- Proveri server logove za greške

**Problem: "Invalid template"**
- Proveri da li je Template ID tačan
- Proveri da li template postoji u tvom EmailJS account-u

**Problem: "Invalid service"**
- Proveri da li je Service ID tačan
- Proveri da li je servis aktivan u EmailJS dashboard-u
