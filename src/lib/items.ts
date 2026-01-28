/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  collection,
  doc,
  getDocs,
  increment,
  limit as firestoreLimit,
  orderBy,
  query,
  QueryConstraint,
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
  const { coupleId, collectionId, limit } = params;

  const ref = collection(db, "couples", coupleId, "items");
  const constraints: QueryConstraint[] = [
    where("collectionId", "==", collectionId),
    orderBy("createdAt", "desc"),
  ];

  if (limit) {
    constraints.push(firestoreLimit(limit));
  }

  const q = query(ref, ...constraints);

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/** Obtiene los últimos N items de múltiples colecciones (para previews) */
export async function getPreviewItemsForCollections(params: {
  coupleId: string;
  collectionIds: string[];
  limitPerCollection?: number;
}) {
  const { coupleId, collectionIds, limitPerCollection = 3 } = params;

  const results: Record<string, any[]> = {};

  // Fetch en paralelo para mejor performance
  await Promise.all(
    collectionIds.map(async (collectionId) => {
      const items = await listItemsByCollection({
        coupleId,
        collectionId,
        limit: limitPerCollection,
      });
      results[collectionId] = items;
    })
  );

  return results;
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

/** Cambia el status de un item (pending ↔ done) */
export async function toggleItemStatus(params: {
  coupleId: string;
  itemId: string;
  newStatus: "pending" | "done";
}) {
  const { coupleId, itemId, newStatus } = params;
  const itemRef = doc(db, "couples", coupleId, "items", itemId);

  return await runTransaction(db, async (tx) => {
    tx.update(itemRef, { status: newStatus });
  });
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

// ─────────────────────────────────────────────────────────────
// COMENTARIOS
// ─────────────────────────────────────────────────────────────

export type Comment = {
  id: string;
  text: string;
  authorId: string;
  createdAt: any; // Firestore Timestamp
};

/** Agrega un comentario a un item */
export async function addComment(params: {
  coupleId: string;
  itemId: string;
  text: string;
  authorId: string;
}) {
  const { coupleId, itemId, text, authorId } = params;

  const trimmed = (text || "").trim();
  if (!trimmed) throw new Error("El comentario no puede estar vacío");

  const commentsRef = collection(
    db,
    "couples",
    coupleId,
    "items",
    itemId,
    "comments"
  );

  const newCommentRef = doc(commentsRef);

  return await runTransaction(db, async (tx) => {
    tx.set(newCommentRef, {
      text: trimmed,
      authorId,
      createdAt: serverTimestamp(),
    });

    // Opcional: incrementar contador de comentarios en el item
    const itemRef = doc(db, "couples", coupleId, "items", itemId);
    tx.set(itemRef, { commentCount: increment(1) }, { merge: true });

    return newCommentRef.id;
  });
}

/** Lista los comentarios de un item (más recientes primero) */
export async function listComments(params: {
  coupleId: string;
  itemId: string;
  limitCount?: number;
}) {
  const { coupleId, itemId, limitCount } = params;

  const commentsRef = collection(
    db,
    "couples",
    coupleId,
    "items",
    itemId,
    "comments"
  );

  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

  if (limitCount) {
    constraints.push(firestoreLimit(limitCount));
  }

  const q = query(commentsRef, ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Comment, "id">),
  })) as Comment[];
}

/** Elimina un comentario */
export async function deleteComment(params: {
  coupleId: string;
  itemId: string;
  commentId: string;
}) {
  const { coupleId, itemId, commentId } = params;

  const commentRef = doc(
    db,
    "couples",
    coupleId,
    "items",
    itemId,
    "comments",
    commentId
  );

  return await runTransaction(db, async (tx) => {
    tx.delete(commentRef);

    // Decrementar contador
    const itemRef = doc(db, "couples", coupleId, "items", itemId);
    tx.set(itemRef, { commentCount: increment(-1) }, { merge: true });
  });
}
