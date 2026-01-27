/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
  rem,
  useMantineTheme,
} from "@mantine/core";

import { useMediaQuery } from "@mantine/hooks";

import {
  IconTrash,
  IconExternalLink,
  IconPlus,
  IconInfoCircle,
} from "@tabler/icons-react";

import { ThemeToggle } from "../components/ThemeToggle";
import { useUser } from "../context/UserProvider";

import {
  addItem,
  getDomain,
  listInboxItems,
  moveItemToCollection,
  deleteItem,
} from "../lib/items";
import { createCollection, listCollections } from "../lib/collections";
import { CoupleGate } from "../components/CoupleGate";
import { LinkItemCard } from "../components/LinkItemCard";

function normalizeUrl(raw: string) {
  let t = (raw || "").trim();
  if (!t) return "";
  if (/^www\./i.test(t)) t = `https://${t}`;
  t = t.replace(/\s+/g, "");
  return t;
}

type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

export default function HomePage() {
  return (
    <CoupleGate mode="requireCouple">
      <InboxInner />
    </CoupleGate>
  );
}

function InboxInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const { fbUser, userDoc, loading: userLoading } = useUser() as any;

  // form
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // data
  const [collections, setCollections] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  // destination / create collection inline
  const [selectedCollection, setSelectedCollection] = useState("INBOX");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);

  // previews cache (inbox rows)
  const [previews, setPreviews] = useState<Record<string, LinkPreview | null>>(
    {},
  );

  // share-target params
  const sharedUrl = sp.get("sharedUrl") || "";
  const sharedTitle = sp.get("sharedTitle") || "";
  const sharedText = sp.get("sharedText") || "";

  const hasShared = useMemo(() => !!sharedUrl, [sharedUrl]);

  // ready gate
  const isReady = !!fbUser && !!userDoc && !!userDoc?.coupleId && !userLoading;

  const coupleId = useMemo(
    () => (isReady ? (userDoc.coupleId as string) : null),
    [isReady, userDoc],
  );
  const uid = useMemo(
    () => (isReady ? (fbUser.uid as string) : null),
    [isReady, fbUser],
  );

  const collectionOptions = useMemo(() => {
    return [
      { value: "INBOX", label: "📥 Inbox" },
      ...collections.map((c) => ({
        value: c.id,
        label: `${c.emoji || "✨"} ${c.name}`,
      })),
      { value: "__new__", label: "➕ Nueva colección…" },
    ];
  }, [collections]);

  async function refresh() {
    if (!coupleId) return;
    setLoading(true);
    try {
      const [cols, inbox] = await Promise.all([
        listCollections(coupleId),
        listInboxItems({ coupleId }),
      ]);
      setCollections(cols);
      setItems(inbox);

      // si la colección seleccionada ya no existe, vuelve a inbox
      if (
        !cols.find((c) => c.id === selectedCollection) &&
        selectedCollection !== "INBOX"
      ) {
        setSelectedCollection("INBOX");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!coupleId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  useEffect(() => {
    if (!hasShared) return;
    setUrl(normalizeUrl(sharedUrl));
    setTitle(sharedTitle);
    setNote(sharedText);
  }, [hasShared, sharedUrl, sharedTitle, sharedText]);

  async function save() {
    setMsg(null);
    if (!coupleId || !uid) return setMsg("Cargando usuario…");

    const finalUrl = normalizeUrl(url);
    if (!finalUrl) return setMsg("Pega un link primero.");

    try {
      new URL(finalUrl);
    } catch {
      return setMsg("Link inválido. Debe empezar por https://");
    }

    setSaving(true);
    try {
      await addItem({
        coupleId,
        createdBy: uid,
        url: finalUrl,
        title: title || sharedTitle || null,
        note: note || null,
        collectionId: selectedCollection || "INBOX",
      });

      setMsg("Guardado ✅");
      router.replace("/");
      setUrl("");
      setTitle("");
      setNote("");
      setSelectedCollection("INBOX");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function onMove(item: any, toCollectionId: string) {
    setMsg(null);
    if (!coupleId) return;

    const fromCollectionId = item.collectionId || "INBOX";
    if (fromCollectionId === toCollectionId) return;

    setMovingId(item.id);
    try {
      await moveItemToCollection({
        coupleId,
        itemId: item.id,
        fromCollectionId,
        toCollectionId,
      });

      // si se mueve fuera de INBOX, lo removemos de la lista
      if (toCollectionId !== "INBOX") {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      } else {
        await refresh();
      }
      setMsg("Movido ✅");
    } catch (e: any) {
      setMsg(e?.message || "No pude mover");
    } finally {
      setMovingId(null);
    }
  }

  async function handleCreateCollection() {
    if (!coupleId || !uid) return;
    if (!newCollectionName.trim()) return;

    setCreatingCollection(true);
    try {
      const col = (await createCollection({
        coupleId,
        name: newCollectionName.trim(),
        emoji: "✨",
        createdBy: uid,
      })) as { id: string } | string;

      const id = typeof col === "string" ? col : col.id;

      setNewCollectionName("");
      setShowNewCollection(false);
      await refresh();
      setSelectedCollection(id);
    } catch (e: any) {
      setMsg(e?.message || "No se pudo crear");
    } finally {
      setCreatingCollection(false);
    }
  }

  // gate render
  if (userLoading || (!fbUser && !userDoc)) {
    return (
      <Box mih="100vh" style={{ display: "grid", placeItems: "center" }}>
        <Loader />
      </Box>
    );
  }

  if (!isReady) {
    return (
      <Box mih="100vh" style={{ display: "grid", placeItems: "center" }}>
        <Text c="dimmed">Aún no estás vinculado a una pareja.</Text>
      </Box>
    );
  }

  return (
    <Box
      mih="100vh"
      pb="xl"
      style={{
        background:
          "radial-gradient(1200px 600px at 18% 0%, rgba(255,105,180,0.16), transparent 55%), radial-gradient(1200px 600px at 82% 0%, rgba(99,102,241,0.12), transparent 55%), var(--mantine-color-body)",
      }}
    >
      {/* Header */}
      <Box
        pos="sticky"
        top={0}
        style={{
          zIndex: 10,
          backdropFilter: "blur(10px)",
          background:
            "color-mix(in srgb, var(--mantine-color-body) 78%, transparent)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Container size={860} py="md">
          <Group justify="space-between" align="center">
            <Group gap="sm" align="baseline">
              <Title order={1} size={26} style={{ letterSpacing: -0.6 }}>
                Inbox 💞
              </Title>
            </Group>

            <Group gap="sm">
              <ThemeToggle />
              <Button
                variant="default"
                radius="xl"
                onClick={() => router.push("/collections")}
              >
                Colecciones
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      <Container size={860} mt="lg">
        <Stack gap="md">
          {/* Composer */}
          <Paper
            withBorder
            radius="xl"
            p="md"
            style={{
              background:
                "color-mix(in srgb, var(--mantine-color-body) 92%, transparent)",
            }}
          >
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={800}>Guardar un link</Text>
              {hasShared && (
                <Badge variant="light" radius="xl">
                  Compartido ✅
                </Badge>
              )}
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Link"
                value={url}
                onChange={(e) => setUrl(e.currentTarget.value)}
                placeholder="Pega un link…"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
              />

              <TextInput
                label="Título"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                placeholder="Título (opcional)"
                autoCapitalize="sentences"
                autoCorrect="on"
              />

              <Select
                label="Destino"
                value={selectedCollection}
                onChange={(v) => {
                  const val = v || "INBOX";
                  if (val === "__new__") setShowNewCollection(true);
                  else {
                    setSelectedCollection(val);
                    setShowNewCollection(false);
                  }
                }}
                data={collectionOptions}
                searchable={false}
              />

              <Textarea
                label="Nota"
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                placeholder="Opcional…"
                autosize
                minRows={2}
                maxRows={4}
              />

              <Box>
                <Text size="sm" fw={600} mb={6}>
                  &nbsp;
                </Text>
                <Button
                  onClick={save}
                  loading={saving}
                  leftSection={<IconPlus size={16} />}
                  radius="xl"
                  size="md"
                  fullWidth
                >
                  Guardar
                </Button>
              </Box>
            </SimpleGrid>

            {showNewCollection && (
              <Card withBorder radius="lg" p="md" mt="sm">
                <Group gap="sm" align="flex-end" wrap="wrap">
                  <TextInput
                    value={newCollectionName}
                    onChange={(e) =>
                      setNewCollectionName(e.currentTarget.value)
                    }
                    placeholder="Nombre de la colección"
                    disabled={creatingCollection}
                    style={{ flex: 1, minWidth: rem(220) }}
                  />
                  <Button
                    onClick={handleCreateCollection}
                    loading={creatingCollection}
                    disabled={!newCollectionName.trim()}
                    radius="xl"
                  >
                    Crear
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowNewCollection(false);
                      setNewCollectionName("");
                    }}
                    disabled={creatingCollection}
                    radius="xl"
                  >
                    Cancelar
                  </Button>
                </Group>
              </Card>
            )}

            {msg && (
              <Alert
                mt="sm"
                radius="lg"
                variant="light"
                icon={<IconInfoCircle size={16} />}
              >
                {msg}
              </Alert>
            )}
          </Paper>

          {/* List */}
          <Paper
            withBorder
            radius="xl"
            p="md"
            style={{
              background:
                "color-mix(in srgb, var(--mantine-color-body) 92%, transparent)",
            }}
          >
            <Group justify="space-between" align="center" mb="sm">
              <Group gap="sm" align="baseline">
                <Text fw={800}>Por organizar</Text>
                <Text size="sm" c="dimmed">
                  {loading ? "…" : `${items.length}`}
                </Text>
              </Group>
              {loading && <Loader size="sm" />}
            </Group>

            <Divider mb="sm" />

            {loading ? (
              <Stack align="center" py="xl" gap="sm">
                <Loader />
                <Text c="dimmed" size="sm">
                  Cargando…
                </Text>
              </Stack>
            ) : items.length === 0 ? (
              <Card withBorder radius="xl" p="lg">
                <Stack gap="xs">
                  <Text fw={800}>Todo limpio ✨</Text>
                  <Text c="dimmed" size="sm">
                    Guarda un link arriba y lo verán juntos luego.
                  </Text>
                </Stack>
              </Card>
            ) : (
              <Stack gap="sm">
                {items.map((it) => (
                  <LinkItemCard
                    key={it.id}
                    item={it}
                    collections={collections}
                    moving={movingId === it.id}
                    includeInboxInMove={false}
                    previewCache={previews}
                    setPreviewCache={setPreviews}
                    onMove={(toId) => onMove(it, toId)}
                    onDelete={async () => {
                      if (!coupleId) return setMsg("Cargando usuario…");
                      if (!window.confirm("¿Eliminar este link?")) return;

                      setMovingId(it.id);
                      try {
                        await deleteItem({
                          coupleId,
                          itemId: it.id,
                          collectionId: "INBOX",
                        });
                        setItems((prev) => prev.filter((x) => x.id !== it.id));
                        setMsg("Eliminado ✅");
                      } finally {
                        setMovingId(null);
                      }
                    }}
                  />
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}