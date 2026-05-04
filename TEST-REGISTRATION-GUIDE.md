# Kako da testiraš registraciju API endpoint

## 📋 Načini testiranja

### 1. 🖥️ Preko browser-a (Frontend forma) - NAJJEDNOSTAVNIJE

1. **Pokreni server:**
   ```bash
   npm run dev
   ```

2. **Otvori browser:**
   ```
   http://localhost:3000/me/register
   ```

3. **Popuni formu:**
   - Username
   - Email
   - Password
   - Izaberi platforme (LMS, Ecommerce, DMS ili sve)
   - Klikni "Registruj se"

4. **Proveri rezultat:**
   - Ako je uspešno → preusmerava na dashboard
   - Ako ima grešku → prikazuje se poruka o grešci

---

### 2. 🧪 Preko test skripte (Automatski)

1. **Pokreni test skriptu:**
   ```bash
   node test-registration.mjs
   ```

2. **Šta testira:**
   - Registracija na sve tri platforme
   - Registracija samo na LMS
   - Registracija samo na Ecommerce
   - Registracija samo na DMS
   - Registracija na LMS + Ecommerce

3. **Rezultat:**
   - Vidiš status svake registracije
   - Vidiš greške ako postoje

---

### 3. 📮 Preko Postman-a

1. **Method:** `POST`
2. **URL:** `http://localhost:3000/api/auth/register`
3. **Headers:**
   ```
   Content-Type: application/json
   ```
4. **Body (raw JSON):**

   **Sve tri platforme:**
   ```json
   {
     "username": "testuser123",
     "email": "test123@example.com",
     "password": "Test123!",
     "displayName": "Test User",
     "selectedPlatforms": ["lms", "ecommerce", "dms"]
   }
   ```

   **Samo LMS:**
   ```json
   {
     "username": "testuser_lms",
     "email": "testlms@example.com",
     "password": "Test123!",
     "selectedPlatforms": ["lms"]
   }
   ```

   **Samo Ecommerce:**
   ```json
   {
     "username": "testuser_ecom",
     "email": "testecom@example.com",
     "password": "Test123!",
     "selectedPlatforms": ["ecommerce"]
   }
   ```

   **Samo DMS:**
   ```json
   {
     "username": "testuser_dms",
     "email": "testdms@example.com",
     "password": "Test123!",
     "selectedPlatforms": ["dms"]
   }
   ```

5. **Klikni "Send"**

---

### 4. 💻 Preko curl komande (Terminal)

**Sve tri platforme:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "test123@example.com",
    "password": "Test123!",
    "selectedPlatforms": ["lms", "ecommerce", "dms"]
  }'
```

**Samo LMS:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_lms",
    "email": "testlms@example.com",
    "password": "Test123!",
    "selectedPlatforms": ["lms"]
  }'
```

---

## 📊 Očekivani response

### ✅ Uspešna registracija (200 OK):
```json
{
  "user": {
    "_id": "...",
    "username": "testuser123",
    "email": "test123@example.com",
    "role": "user",
    "displayName": "Test User"
  },
  "registrations": {
    "lms": {
      "success": true,
      "userId": "..."
    },
    "ecommerce": {
      "success": true,
      "data": {...}
    },
    "dms": {
      "success": true,
      "data": {...}
    }
  }
}
```

### ❌ Greška (400/500):
```json
{
  "error": "Registration failed in one or more selected systems",
  "details": [
    "ECOMMERCE: Missing fields",
    "DMS: Failed to get DMS token"
  ],
  "registrations": {
    "lms": {"success": true, "userId": "..."},
    "ecommerce": {"success": false, "error": "..."},
    "dms": {"success": false, "error": "..."}
  }
}
```

---

## 🔍 Šta proveriti

1. **Ako izabereš sve tri platforme:**
   - ✅ Korisnik se kreira lokalno (MongoDB)
   - ✅ Registruje se na eksternom LMS serveru
   - ✅ Registruje se na Ecommerce sistemu
   - ✅ Registruje se na DMS sistemu
   - ✅ Ako bilo koja ne uspe → rollback (briše se lokalno)

2. **Ako izabereš samo jednu platformu:**
   - ✅ Korisnik se kreira lokalno
   - ✅ Registruje se samo na izabranoj platformi
   - ✅ Ostale platforme se preskaču

3. **Ako ne izabereš ništa:**
   - ✅ Podrazumevano se registruje na sve tri platforme

---

## 🐛 Troubleshooting

### Problem: "Missing fields"
- **Uzrok:** Ecommerce sistem traži dodatne field-ove
- **Rešenje:** Proveri da li Ecommerce API očekuje drugačije field-ove

### Problem: "Failed to get DMS token"
- **Uzrok:** DMS server nije dostupan ili kredencijali nisu ispravni
- **Rešenje:** Proveri da li je DMS server pokrenut

### Problem: "Network Error"
- **Uzrok:** Server nije pokrenut ili URL nije tačan
- **Rešenje:** Proveri da li je server pokrenut na `http://localhost:3000`

---

## 📝 Napomene

- **Lokalna registracija:** Korisnik se uvek kreira lokalno (u našoj MongoDB) za autentifikaciju
- **Rollback:** Ako bilo koja od izabranih registracija ne uspe, korisnik se briše iz lokalne baze
- **Cookie:** Nakon uspešne registracije, postavlja se `auth-token` cookie za automatsko logovanje
