/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/collections.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase"; // ajusta

export async function listCollections(coupleId: string) {
  const ref = collection(db, "couples", coupleId, "collections");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function createCollection(params: {
  coupleId: string;
  name: string;
  emoji: string;
  createdBy: string;
}) {
  const ref = collection(db, "couples", params.coupleId, "collections");
  const doc = await addDoc(ref, {
    name: params.name.trim(),
    emoji: params.emoji || "✨",
    createdBy: params.createdBy,
    createdAt: serverTimestamp(),
    itemCount: 0,
  });
  return doc.id;
}

export async function deleteCollectionDoc(params: {
  coupleId: string;
  collectionId: string;
}) {
  const { coupleId, collectionId } = params;
  await deleteDoc(doc(db, "couples", coupleId, "collections", collectionId));
}
