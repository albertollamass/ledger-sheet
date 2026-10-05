# ledger-sheet

🌐 **Web en producción:** https://ledger-sheet-90e92.web.app/

Tracker web de ingresos y gastos (tu plantilla de Excel, en web con Firebase):
login con Google, vista anual como el Excel, vista por mes, histórico por años,
importación de tu propio Excel y saldo inicial.

## Desarrollo local

```bash
npm install
cp .env.example .env   # rellena con tu firebaseConfig
npm run dev
```

Ver `FIREBASE_SETUP.md` para crear el proyecto Firebase, las reglas de Firestore
y el despliegue con GitHub Actions.
