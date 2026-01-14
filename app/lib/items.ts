import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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

  if (!url) throw new Error("URL requerida");

  return await addDoc(collection(db, "items"), {
    coupleId,
    collectionId,
    url,
    title,
    note,
    status: "pending",
    createdAt: serverTimestamp(),
    createdBy,
  });
}
