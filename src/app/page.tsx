/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  rem,
} from "@mantine/core";

import {
  IconPlus,
  IconInfoCircle,
  IconFolderPlus,
  IconBookmark,
} from "@tabler/icons-react";

import { ThemeToggle } from "../components/ThemeToggle";
import { useUser } from "../context/UserProvider";

import {
  addItem,
  listInboxItems,
  moveItemToCollection,
  deleteItem,
  toggleItemStatus,
} from "../lib/items";
import { createCollection, listCollections } from "../lib/collections";
import { CoupleGate } from "../components/CoupleGate";
import { LinkItemCard } from "../components/LinkItemCard";
import { NotificationPermissionBanner } from "../components/NotificationPermissionBanner";

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

  // destination
  const [selectedCollection, setSelectedCollection] = useState("INBOX");

  // create collection modal
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);

  // previews cache (inbox rows)
  const [previews, setPreviews] = useState<Record<string, LinkPreview | null>>(
    {},
  );

  // filtro de status
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">(
    "all",
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
      { value: "__new__", label: "➕ Crear colección…" },
    ];
  }, [collections]);

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((it) => it.status === statusFilter);
  }, [items, statusFilter]);

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

  async function handleToggleStatus(item: any) {
    if (!coupleId) return;
    const newStatus = item.status === "done" ? "pending" : "done";
    setMovingId(item.id);
    try {
      await toggleItemStatus({ coupleId, itemId: item.id, newStatus });
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: newStatus } : it,
        ),
      );
    } catch (e: any) {
      setMsg(e?.message || "No pude cambiar el estado");
    } finally {
      setMovingId(null);
    }
  }

  function openCreateCollectionModal() {
    setCollectionModalOpen(true);
    setNewCollectionName("");
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

      setCollectionModalOpen(false);
      setNewCollectionName("");
      await refresh();
      setSelectedCollection(id);
      setMsg("Colección creada ✨");
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
      {/* Create collection modal */}
      <Modal
        opened={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        title={
          <Group gap="sm">
            <IconFolderPlus size={18} />
            <Text fw={800}>Nueva colección</Text>
          </Group>
        }
        centered
        radius="lg"
      >
        <Stack gap="sm">
          <Text c="dimmed" size="sm">
            Dale un nombre corto y fácil de recordar (ej: “Citas”,
            “Restaurantes”, “Películas”).
          </Text>

          <TextInput
            label="Nombre"
            placeholder="Ej: Planes del finde"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.currentTarget.value)}
            autoFocus
            disabled={creatingCollection}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateCollection();
            }}
          />

          <Group justify="flex-end">
            <Button
              variant="default"
              radius="xl"
              onClick={() => setCollectionModalOpen(false)}
              disabled={creatingCollection}
            >
              Cancelar
            </Button>
            <Button
              radius="xl"
              leftSection={<IconPlus size={16} />}
              onClick={handleCreateCollection}
              loading={creatingCollection}
              disabled={!newCollectionName.trim()}
            >
              Crear
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Header */}
      <Box
        pos="sticky"
        top={0}
        style={{
          zIndex: 10,
          backdropFilter: "blur(12px)",
          background:
            "color-mix(in srgb, var(--mantine-color-body) 78%, transparent)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Container size={920} py="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="sm" align="center">
              <Box>
                <Title order={1} size={24} style={{ letterSpacing: -0.6 }}>
                  Inbox 💞
                </Title>
              </Box>
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

      <Container size={920} mt="lg">
        <Stack gap="md">
          {/* Composer (social post style) */}
          <Paper
            withBorder
            radius="xl"
            p="md"
            style={{
              background:
                "color-mix(in srgb, var(--mantine-color-body) 92%, transparent)",
            }}
          >
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconBookmark size={18} />
                <Text fw={900}>Nuevo guardado</Text>
              </Group>

              <Group gap="xs">
                {hasShared && (
                  <Badge variant="light" radius="xl">
                    Compartido ✅
                  </Badge>
                )}

                <ActionIcon
                  variant="light"
                  radius="xl"
                  size="lg"
                  title="Crear colección"
                  onClick={openCreateCollectionModal}
                >
                  <IconFolderPlus size={18} />
                </ActionIcon>
              </Group>
            </Group>

            <Divider my="sm" />

            <Stack gap="sm">
              <TextInput
                value={url}
                onChange={(e) => setUrl(e.currentTarget.value)}
                placeholder="Pega un link… (ej: YouTube, TikTok, artículo, lugar, producto)"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                radius="lg"
                size="md"
              />

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  placeholder="Ponle un título (opcional)"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  radius="lg"
                />

                <Select
                  value={selectedCollection}
                  onChange={(v) => {
                    const val = v || "INBOX";
                    if (val === "__new__") {
                      openCreateCollectionModal();
                      // vuelve a INBOX hasta que cree la colección (evita quedarse en __new__)
                      setSelectedCollection("INBOX");
                    } else {
                      setSelectedCollection(val);
                    }
                  }}
                  data={collectionOptions}
                  searchable={false}
                  radius="lg"
                />
              </SimpleGrid>

              <Textarea
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                placeholder="Añade una nota tipo caption… (por qué lo guardas, para cuándo, con quién, etc)"
                autosize
                minRows={2}
                maxRows={5}
                radius="lg"
              />

              <Group justify="space-between" align="center" wrap="wrap">
                <Text size="sm" c="dimmed">
                  Tip: pega el link y guarda — luego lo mueves a una colección.
                </Text>

                <Button
                  onClick={save}
                  loading={saving}
                  leftSection={<IconPlus size={16} />}
                  radius="xl"
                  size="md"
                >
                  Guardar
                </Button>
              </Group>

              {msg && (
                <Alert
                  radius="lg"
                  variant="light"
                  icon={<IconInfoCircle size={16} />}
                >
                  {msg}
                </Alert>
              )}
            </Stack>
          </Paper>

          {/* Banner de notificaciones */}
          <NotificationPermissionBanner />

          {/* Feed */}
          <Paper
            withBorder
            radius="xl"
            p="md"
            style={{
              background:
                "color-mix(in srgb, var(--mantine-color-body) 92%, transparent)",
            }}
          >
            <Group
              justify="space-between"
              align="center"
              mb="sm"
              wrap="wrap"
              gap="sm"
            >
              <Group gap="sm" align="baseline">
                <Text fw={900}>Feed</Text>
                <Badge variant="light" radius="xl">
                  {loading ? "…" : `${filteredItems.length}`}
                </Badge>
              </Group>

              <Group gap="sm" align="center">
                <SegmentedControl
                  size="xs"
                  radius="xl"
                  value={statusFilter}
                  onChange={(v) =>
                    setStatusFilter(v as "all" | "pending" | "done")
                  }
                  data={[
                    { value: "all", label: "Todos" },
                    { value: "pending", label: "Pendientes" },
                    { value: "done", label: "Hechos" },
                  ]}
                />
                {loading && <Loader size="sm" />}
              </Group>
            </Group>

            <Divider mb="sm" />

            {loading ? (
              <Stack align="center" py="xl" gap="sm">
                <Loader />
                <Text c="dimmed" size="sm">
                  Cargando…
                </Text>
              </Stack>
            ) : filteredItems.length === 0 ? (
              <Card withBorder radius="xl" p="lg">
                <Stack gap="xs">
                  <Text fw={900}>
                    {statusFilter === "all"
                      ? "Todo limpio ✨"
                      : "Sin items en este filtro"}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {statusFilter === "all"
                      ? "Guarda algo arriba y aparecerá aquí como un post."
                      : "Cambia el filtro para ver otros items."}
                  </Text>
                </Stack>
              </Card>
            ) : (
              <Stack gap="sm">
                {filteredItems.map((it) => (
                  <LinkItemCard
                    key={it.id}
                    item={it}
                    collections={collections}
                    moving={movingId === it.id}
                    includeInboxInMove={false}
                    previewCache={previews}
                    setPreviewCache={setPreviews}
                    coupleId={coupleId || undefined}
                    currentUserId={uid || undefined}
                    onMove={(toId) => onMove(it, toId)}
                    onToggleStatus={() => handleToggleStatus(it)}
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

          {/* Little bottom spacing */}
          <Box h={rem(8)} />
        </Stack>
      </Container>
    </Box>
  );
}
