/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  collection,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export async function addItem(params: {
  coupleId: string;
  createdBy: string;
  url: string;
  title?: string | null;
  note?: string | null;
  collectionId?: string; // default INBOX
}) {
  const {
    coupleId,
    createdBy,
    url,
    title = null,
    note = null,
    collectionId = "INBOX",
  } = params;

  const finalUrl = (url || "").trim();
  if (!finalUrl) throw new Error("URL requerida");

  const itemsRef = collection(db, "couples", coupleId, "items");

  return await runTransaction(db, async (tx) => {
    const newItemRef = doc(itemsRef); // genera id

    tx.set(newItemRef, {
      url: finalUrl,
      title,
      note,
      collectionId,
      status: "pending",
      createdAt: serverTimestamp(),
      createdBy,
    });

    // Solo incrementa si NO es INBOX (porque INBOX no es doc real)
    if (collectionId !== "INBOX") {
      const colRef = doc(db, "couples", coupleId, "collections", collectionId);
      tx.set(colRef, { itemCount: increment(1) }, { merge: true });
    }

    return newItemRef;
  });
}

export async function listInboxItems(params: { coupleId: string }) {
  const { coupleId } = params;
  const ref = collection(db, "couples", coupleId, "items");
  const q = query(
    ref,
    where("collectionId", "==", "INBOX"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function listItemsByCollection(params: {
  coupleId: string;
  collectionId: string; // "INBOX" o id real
  limit?: number;
}) {
  const { coupleId, collectionId } = params;

  const ref = collection(db, "couples", coupleId, "items");
  const q = query(
    ref,
    where("collectionId", "==", collectionId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/**
 * Mueve un item entre colecciones y mantiene itemCount.
 * - INBOX es "virtual" y no tiene doc -> no suma/resta ahí.
 */
export async function moveItemToCollection(params: {
  coupleId: string;
  itemId: string;
  fromCollectionId: string; // actual
  toCollectionId: string; // destino
}) {
  const { coupleId, itemId, fromCollectionId, toCollectionId } = params;
  if (fromCollectionId === toCollectionId) return;

  const itemRef = doc(db, "couples", coupleId, "items", itemId);

  return await runTransaction(db, async (tx) => {
    tx.update(itemRef, { collectionId: toCollectionId });

    // decrementa origen si NO es INBOX
    if (fromCollectionId !== "INBOX") {
      const fromRef = doc(
        db,
        "couples",
        coupleId,
        "collections",
        fromCollectionId
      );
      tx.set(fromRef, { itemCount: increment(-1) }, { merge: true });
    }

    // incrementa destino si NO es INBOX
    if (toCollectionId !== "INBOX") {
      const toRef = doc(db, "couples", coupleId, "collections", toCollectionId);
      tx.set(toRef, { itemCount: increment(1) }, { merge: true });
    }
  });
}

/** Elimina un item y ajusta itemCount si estaba en una colección real */
export async function deleteItem(params: {
  coupleId: string;
  itemId: string;
  collectionId: string; // actual
}) {
  const { coupleId, itemId, collectionId } = params;

  const itemRef = doc(db, "couples", coupleId, "items", itemId);

  return await runTransaction(db, async (tx) => {
    tx.delete(itemRef);

    if (collectionId !== "INBOX") {
      const colRef = doc(db, "couples", coupleId, "collections", collectionId);
      tx.set(colRef, { itemCount: increment(-1) }, { merge: true });
    }
  });
}

/** Mueve TODOS los items de una colección a INBOX */
export async function moveAllItemsToInbox(params: {
  coupleId: string;
  collectionId: string;
}) {
  const { coupleId, collectionId } = params;
  const ref = collection(db, "couples", coupleId, "items");
  const q = query(ref, where("collectionId", "==", collectionId));
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { collectionId: "INBOX" });
  });
  await batch.commit();

  return snap.size; // cuántos movió
}

/** Borra TODOS los items de una colección (destructivo) */
export async function deleteAllItemsInCollection(params: {
  coupleId: string;
  collectionId: string;
}) {
  const { coupleId, collectionId } = params;
  const ref = collection(db, "couples", coupleId, "items");
  const q = query(ref, where("collectionId", "==", collectionId));
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return snap.size;
}

/** Helper pequeño para UI */
export function getDomain(url?: string) {
  try {
    if (!url) return "";
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
