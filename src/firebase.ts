import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
console.log("Initializing Firestore with Database ID:", databaseId);

export const db = getFirestore(app, databaseId);

// Test connection
export async function testConnection() {
  try {
    console.log("Testing connection to Firestore...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error) {
    console.error("Firestore test connection failed:", error);
  }
}
