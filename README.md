# ledger-sheet

🌐 **Web en producción:** https://ledger-sheet-90e92.web.app/

Tracker web de ingresos y gastos (tu plantilla de Excel, en web con Firebase):
login con Google, vista anual como el Excel, vista por mes, histórico por años,
importación de tu propio Excel, saldo inicial, movimientos automáticos mensuales
y nombres de categorías personalizados para cada usuario.

## Desarrollo local

```bash
npm install
cp .env.example .env   # rellena con tu firebaseConfig
npm run dev
```

Ver `FIREBASE_SETUP.md` para crear el proyecto Firebase, las reglas de Firestore
y el despliegue con GitHub Actions.

## Publicar novedades

Cada vez que despliegues una funcionalidad nueva:

1. Añade una entrada con sus puntos a `RELEASES` en `src/domain/releases.js`.
2. Cambia `APP_VERSION` por la nueva versión.

El popup de novedades saldrá una sola vez por usuario y versión. La versión vista se
guarda en las preferencias del usuario (`lastSeenVersion`), así que no reaparece al
recargar ni en otro dispositivo con la misma cuenta.
