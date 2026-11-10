# Configuración Firebase (5 min)

La app ya funciona en **modo demo local** sin Firebase. Para guardar de verdad con tu cuenta:

## 1. Crear proyecto
1. Ve a https://console.firebase.google.com
2. "Añadir proyecto" → nombre `ingresos-gastos` → sin Analytics (o con, da igual).
3. Dentro del proyecto → **Compilación → Authentication → Comenzar**:
   - Proveedor `Correo electrónico/contraseña` → Habilitar → Guardar.
4. **Compilación → Firestore Database → Crear base de datos**:
   - Modo producción → ubicación `europe-west` (o la más cercana) → Habilitar.

## 2. Reglas Firestore
En Firestore → pestaña **Reglas**, pega el contenido de `firestore.rules` de este repo y publica:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Cada usuario solo ve sus propios movimientos.

## 3. Claves web
En Firebase → Configuración del proyecto (rueda) → "Tus apps" → `</>` web app → registra `ledger-web` → copia el `firebaseConfig`.

## 4. Conectar la app
Crea un archivo `.env` en la raíz (copia de `.env.example`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=....firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=....appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Reinicia `npm run dev`.

## 5. Modelo de datos (igual que tu Excel)

- `users/{uid}/movements/{id}`: `{ kind: 'ingreso'|'gasto', group, label (tipo), amount, date 'YYYY-MM-DD', year, month, note, recurringId? }`
- `users/{uid}/yearSettings/{año}`: `{ initialBalance }` → es el "Saldo Inicial" del Excel.
- `users/{uid}/recurring/{id}`: `{ kind, group, label, amount, day, startDate, note, active, lastRun }` → movimientos automáticos mensuales.
- `users/{uid}/settings/preferences`: `{ labels: {…}, groups: {…}, lastSeenVersion }` → nombres personalizados y última versión de novedades vista.

Las categorías vienen de tu hoja 2026 y están en `src/domain/categories.js`. Cada usuario puede renombrarlas desde el botón **Nombres** sin cambiar los datos guardados.

## Despliegue gratis
Opción fácil: Firebase Hosting

```bash
npm i -g firebase-tools
firebase login
firebase init hosting  # dist como public, SPA: yes
npm run build
firebase deploy
```

## Si falla el despliegue en GitHub Actions

Si aparece un error 403 como este:

```
Permission denied to get service [firebasehosting.googleapis.com]
permission: serviceusage.services.get
```

es un cambio de `firebase-tools` 15.34.1 que comprueba la API de Hosting antes de desplegar.
El workflow ya fija `firebaseToolsVersion: v15.34.0` para evitarlo. La solución definitiva es
dar al service account de despliegue el rol **Service Usage Consumer**
(`roles/serviceusage.serviceUsageConsumer`) en Google Cloud IAM y quitar el pin cuando
firebase-tools lo corrija.

Referencia: https://github.com/firebase/firebase-tools/issues/11335
