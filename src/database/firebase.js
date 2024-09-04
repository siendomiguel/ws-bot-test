import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

// Asegúrate de que las credenciales de Firebase estén configuradas correctamente en las variables de entorno
const credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);

initializeApp({
  credential: admin.credential.cert(credentials),
});

export const db = getFirestore();
