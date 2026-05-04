# 📋 Vodič za Nivoe Korisnika (User Roles)

## 🎯 Pregled Nivoa

Sistem podržava 4 nivoa korisnika sa hijerarhijom pristupa:

1. **Admin** (najviši nivo)
   - Puni pristup svim funkcionalnostima
   - Može upravljati svim korisnicima
   - Može menjati role korisnika
   - Pristup admin panelu

2. **Moderator**
   - Može moderirati sadržaj
   - Može upravljati korisnicima (osim admina)
   - Ograničen pristup admin panelu

3. **Editor**
   - Može kreirati i uređivati sadržaj
   - Može upravljati postovima, vestima, resursima
   - Ne može upravljati korisnicima

4. **User** (najniži nivo)
   - Osnovni pristup
   - Može pregledati sadržaj
   - Može kreirati svoj profil

## 🔧 Kako da Postaviš Nivoe Korisnika

### Opcija 1: Preko Admin Panela (Preporučeno)

1. Uloguj se kao **admin**
2. Idi na `/admin/users`
3. U tabeli korisnika, klikni na dropdown pored "Role"
4. Izaberi željeni nivo:
   - **User** - običan korisnik
   - **Editor** - može uređivati sadržaj
   - **Moderator** - može moderirati
   - **Admin** - puni pristup
5. Promena se automatski sačuva

### Opcija 2: Preko API-ja

```bash
# Promeni role korisnika
curl -X PUT http://localhost:3000/api/admin/users/[USER_ID] \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_ADMIN_TOKEN" \
  -d '{"role": "moderator"}'
```

### Opcija 3: Direktno u MongoDB

```javascript
// U MongoDB shell-u ili preko MongoDB Compass
db.users.updateOne(
  { username: "korisnicko_ime" },
  { $set: { role: "editor" } }
);
```

## 📝 Primeri Korišćenja u Kodu

### Provera Role u API Route-u

```typescript
import { requireAdmin, requireModerator, requireEditor, hasRole } from "@/lib/auth";

// Zahteva admin pristup
export async function POST(request: NextRequest) {
  await requireAdmin(); // Samo admin može
  // ...
}

// Zahteva moderator ili viši nivo
export async function PUT(request: NextRequest) {
  await requireModerator(); // Moderator, Admin
  // ...
}

// Zahteva editor ili viši nivo
export async function DELETE(request: NextRequest) {
  await requireEditor(); // Editor, Moderator, Admin
  // ...
}

// Provera role u komponenti
const user = await getCurrentUser();
if (user && hasRole(user.role, "editor")) {
  // Korisnik je editor ili viši
}
```

## 🎨 Hijerarhija Pristupa

```
Admin (4)
  └── Moderator (3)
      └── Editor (2)
          └── User (1)
```

- Svaki nivo ima pristup svim funkcionalnostima nižih nivoa
- Npr. Moderator može sve što može Editor i User

## 🔐 Bezbednost

- Samo **Admin** može menjati role korisnika
- Role se proveravaju na serveru (ne samo na frontendu)
- JWT token sadrži role informacije
- Role se proveravaju pri svakom zahtevu

## 📊 Trenutni Nivoi u Sistemu

- **Prvi korisnik** automatski postaje **Admin**
- **Ostali korisnici** se kreiraju kao **User**
- Role se mogu promeniti preko admin panela

## 🛠️ Dodavanje Novih Nivoa

Ako želiš da dodaš novi nivo:

1. Dodaj u `src/models/User.ts`:
```typescript
export type UserRole = "admin" | "moderator" | "editor" | "user" | "new_role";
```

2. Dodaj u hijerarhiju u `src/lib/auth.ts`:
```typescript
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 5,
  moderator: 4,
  editor: 3,
  new_role: 2,
  user: 1,
};
```

3. Dodaj opciju u admin panel (`src/app/admin/users/page.tsx`):
```tsx
<option value="new_role">New Role</option>
```

## 📍 Lokacije Fajlova

- **Model**: `src/models/User.ts`
- **Auth funkcije**: `src/lib/auth.ts`
- **Admin panel**: `src/app/admin/users/page.tsx`
- **API endpoint**: `src/app/api/admin/users/[id]/route.ts`
