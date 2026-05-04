# 📊 Gde vidiš logove kada pushuješ na produkciju

## 🚀 Na Vercel-u (produkcija)

Kada pushuješ na Vercel, svi `console.log()` i `console.error()` će se videti u **Vercel Dashboard**.

### Kako pristupiti logovima:

1. **Idi na Vercel Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Izaberi svoj projekat**

3. **Klikni na "Deployments" tab**

4. **Klikni na najnoviji deployment**

5. **Klikni na "Functions" tab** ili **"Logs" tab**

6. **Tamo ćeš videti sve logove u realnom vremenu!**

---

## 📋 Šta ćeš videti u logovima

### ✅ Uspešna registracija:

```
================================================================================
🚀 REGISTRATION REQUEST STARTED
================================================================================
📥 Received registration request: { ... }
🎯 Selected platforms: [ 'lms', 'ecommerce', 'dms' ]
✅ Validation passed: { username: 'testuser', email: 'test@exa...' }
✅ User does not exist, proceeding with registration
💾 Creating user in local database (MongoDB)...
✅ Local user created successfully: { userId: '...', username: 'testuser', role: 'user' }

📚 Starting LMS registration...
   URL: https://edu.southadriaticskills.org/api/auth/register
   Request payload: { userName: 'testuser', userEmail: 'test@example.com', ... }
   Response status: 200 OK
   ✅ LMS registration SUCCESS: { userId: '...' }

🛒 Starting ECOMMERCE registration...
   URL: https://market.southadriaticskills.org/api/user/register-with-role
   Request payload: { name: 'Test User', email: 'test@example.com', ... }
   Response status: 200 OK
   ✅ ECOMMERCE registration SUCCESS

📁 Starting DMS registration...
   Token URL: https://info.southadriaticskills.org/api/token/
   Step 1: Getting DMS token...
   Token response status: 200 OK
   ✅ DMS token obtained successfully
   Step 2: Creating DMS user...
   Users URL: https://info.southadriaticskills.org/api/users/
   Request payload: { username: 'testuser', email: 'test@example.com', ... }
   Response status: 201 Created
   ✅ DMS registration SUCCESS

🔍 Checking registration results...
   LMS: ✅ (required)
   ECOMMERCE: ✅ (required)
   DMS: ✅ (required)
✅ All selected registrations succeeded!

🔐 Creating authentication token...

================================================================================
✅ REGISTRATION COMPLETED SUCCESSFULLY
================================================================================
⏱️  Total duration: 2345ms
👤 User: { username: 'testuser', email: 'test@exa...', userId: '...' }
📊 Final results: { lms: '✅', ecommerce: '✅', dms: '✅' }
================================================================================
```

### ❌ Greška (npr. Ecommerce ne radi):

```
================================================================================
🚀 REGISTRATION REQUEST STARTED
================================================================================
📥 Received registration request: { ... }
🎯 Selected platforms: [ 'lms', 'ecommerce', 'dms' ]
✅ Validation passed: { username: 'testuser', email: 'test@exa...' }
✅ User does not exist, proceeding with registration
💾 Creating user in local database (MongoDB)...
✅ Local user created successfully: { userId: '...', username: 'testuser', role: 'user' }

📚 Starting LMS registration...
   ✅ LMS registration SUCCESS: { userId: '...' }

🛒 Starting ECOMMERCE registration...
   URL: https://market.southadriaticskills.org/api/user/register-with-role
   Request payload: { name: 'Test User', email: 'test@example.com', ... }
   Response status: 400 Bad Request
   ❌ ECOMMERCE registration FAILED: { status: 400, error: 'Missing fields' }

📁 Starting DMS registration...
   ✅ DMS registration SUCCESS

🔍 Checking registration results...
   LMS: ✅ (required)
   ECOMMERCE: ❌ (required)
   DMS: ✅ (required)

❌ ROLLBACK REQUIRED: One or more registrations failed
   ✅ User rolled back (deleted from local database)
   Error details: [ 'ECOMMERCE: Missing fields' ]

================================================================================
❌ REGISTRATION FAILED (General Error)
================================================================================
```

---

## 🔍 Šta da očekuješ kada pushuješ na produkciju

### 1. **Lokalno (localhost:3000):**
   - Logovi se vide u terminalu gde pokrećeš `npm run dev`
   - Sve console.log() se prikazuje direktno

### 2. **Na produkciji (Vercel):**
   - Logovi se vide u Vercel Dashboard → Deployments → Functions/Logs
   - Možeš filtrirati po funkciji (`/api/auth/register`)
   - Možeš videti logove u realnom vremenu ili historijske logove

### 3. **Šta ćeš videti:**
   - ✅ Svaki korak registracije (LMS, Ecommerce, DMS)
   - ✅ Status svakog API poziva (200, 400, 500, itd.)
   - ✅ Vreme trajanja registracije
   - ✅ Detaljne greške ako nešto ne uspe
   - ✅ Rollback akcije ako je potrebno

---

## 🎯 Kako da testiraš na produkciji

1. **Pushuj kod na GitHub:**
   ```bash
   git add .
   git commit -m "Add detailed logging for registration"
   git push
   ```

2. **Sačekaj da se Vercel deployment završi** (obično 1-2 minuta)

3. **Otvori Vercel Dashboard → Deployments → najnoviji deployment → Logs**

4. **Testiraj registraciju:**
   - Otvori tvoj produkcijski URL (npr. `https://tvoj-domen.vercel.app/me/register`)
   - Popuni formu i registruj korisnika
   - **ODMAH** idi na Vercel Dashboard → Logs
   - Vidiš sve logove u realnom vremenu!

---

## 📝 Napomene

- **Svi logovi su vidljivi** u Vercel Dashboard-u
- **Logovi se čuvaju** nekoliko dana (zavisi od Vercel plana)
- **Možeš filtrirati** logove po funkciji, vremenu, itd.
- **Ne brini** - logovi ne utiču na performanse aplikacije

---

## 🐛 Troubleshooting

### Problem: Ne vidim logove u Vercel Dashboard-u
- **Rešenje:** Proveri da li je deployment završen. Ponekad treba malo vremena da se logovi pojave.

### Problem: Logovi su previše detaljni
- **Rešenje:** Možeš ukloniti neke console.log() pozive ako želiš, ali preporučujem da ih ostaviš za debugging.

### Problem: Ne vidim greške
- **Rešenje:** Proveri da li koristiš `console.error()` za greške (što već koristimo).

---

## ✅ Rezime

**Kada pushuješ na produkciju:**
1. ✅ Svi logovi će se videti u **Vercel Dashboard → Deployments → Logs**
2. ✅ Vidiš **svaki korak** registracije
3. ✅ Vidiš **status** svakog API poziva
4. ✅ Vidiš **greške** ako nešto ne uspe
5. ✅ Vidiš **vreme trajanja** registracije

**Nema potrebe za dodatnim alatima - sve je u Vercel Dashboard-u!** 🎉
