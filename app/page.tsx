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
} from "@mantine/core";

import {
  IconTrash,
  IconExternalLink,
  IconPlus,
  IconInfoCircle,
} from "@tabler/icons-react";

import { AuthGate } from "./components/AuthGate";
import { ThemeToggle } from "./components/ThemeToggle";
import { useUser } from "./context/UserProvider";

import {
  addItem,
  getDomain,
  listInboxItems,
  moveItemToCollection,
  deleteItem,
} from "./lib/items";
import { createCollection, listCollections } from "./lib/collections";
import { CoupleGate } from "./components/CoupleGate";

function normalizeUrl(raw: string) {
  let t = (raw || "").trim();
  if (!t) return "";
  if (/^www\./i.test(t)) t = `https://${t}`;
  t = t.replace(/\s+/g, "");
  return t;
}

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
  const { fbUser, userDoc } = useUser();

  const coupleId = userDoc!.coupleId!;
  const uid = fbUser!.uid;

  const sharedUrl = sp.get("sharedUrl") || "";
  const sharedTitle = sp.get("sharedTitle") || "";
  const sharedText = sp.get("sharedText") || "";

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState(""); // Nuevo estado para el título
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [collections, setCollections] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState("INBOX");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);

  const hasShared = useMemo(() => !!sharedUrl, [sharedUrl]);

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
    setLoading(true);
    try {
      const [cols, inbox] = await Promise.all([
        listCollections(coupleId),
        listInboxItems({ coupleId }),
      ]);
      setCollections(cols);
      setItems(inbox);

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
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  useEffect(() => {
    if (!hasShared) return;
    setUrl(normalizeUrl(sharedUrl));
    setTitle(sharedTitle); // Setear el título compartido si existe
    setNote(sharedText);
  }, [hasShared, sharedUrl, sharedTitle, sharedText]);

  async function save() {
    setMsg(null);
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
        title: title || sharedTitle || null, // Usar el título ingresado si existe
        note: note || null,
        collectionId: selectedCollection || "INBOX",
      });

      setMsg("Guardado ✅");
      router.replace("/");
      setUrl("");
      setTitle(""); // Limpiar el campo título
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
    if (!newCollectionName.trim()) return;
    setCreatingCollection(true);
    try {
      const col = (await createCollection({
        coupleId,
        name: newCollectionName.trim(),
        emoji: "✨",
        createdBy: uid,
      })) as { id: string } | string;
      setNewCollectionName("");
      setShowNewCollection(false);
      await refresh();
      setSelectedCollection(
        typeof col === "string" ? col : (col as { id: string }).id
      );
    } catch (e: any) {
      setMsg(e?.message || "No se pudo crear");
    } finally {
      setCreatingCollection(false);
    }
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
      {/* Header compacto */}
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
              <Text size="sm" c="dimmed">
                {loading ? "…" : `${items.length}`}
              </Text>
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
          {/* Form compacto */}
          <Paper withBorder radius="xl" p="md">
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
                placeholder="Título del link (opcional)"
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
                <Group justify="space-between" align="center">
                  <Button
                    onClick={save}
                    loading={saving}
                    leftSection={<IconPlus size={16} />}
                    radius="md"
                    size="md"
                    style={{ flex: 1 }}
                  >
                    Guardar
                  </Button>

                  {hasShared && (
                    <Badge variant="light" radius="xl" ml="sm">
                      Compartido ✅
                    </Badge>
                  )}
                </Group>
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

          {/* Lista */}
          <Paper withBorder radius="xl" p="md">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={800}>Por organizar</Text>
              {loading && <Loader size="sm" />}
            </Group>

            <Divider mb="sm" />

            {loading ? (
              <Text c="dimmed" size="sm">
                Cargando…
              </Text>
            ) : items.length === 0 ? (
              <Box py="md">
                <Text c="dimmed" size="sm">
                  Guarda un link y lo verán juntos luego ✨
                </Text>
              </Box>
            ) : (
              <Stack gap="sm">
                {items.map((it) => (
                  <InboxItemRow
                    key={it.id}
                    item={it}
                    collections={collections}
                    moving={movingId === it.id}
                    onMove={(toId) => onMove(it, toId)}
                    onDelete={async () => {
                      const ok = window.confirm("¿Eliminar este link?");
                      if (!ok) return;

                      setMovingId(it.id);
                      try {
                        await deleteItem({
                          coupleId,
                          itemId: it.id,
                          collectionId: "INBOX",
                        });
                        setItems((prev) => prev.filter((x) => x.id !== it.id));
                        setMsg("Eliminado ✅");
                      } catch (e: any) {
                        setMsg(e?.message || "No pude eliminar");
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

function InboxItemRow(props: {
  item: any;
  collections: any[];
  moving: boolean;
  onMove: (toCollectionId: string) => void;
  onDelete?: () => void;
}) {
  const { item, collections, moving, onMove, onDelete } = props;

  const domain = getDomain(item.url);
  const title = item.title || domain || "Idea guardada";
  const note = item.note || "";

  const moveOptions = collections.map((c) => ({
    value: c.id,
    label: `${c.emoji || "✨"} ${c.name}`,
  }));

  return (
    <Card withBorder radius="lg" p="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Group gap={8} wrap="wrap">
            <Badge variant="light" radius="xl">
              {domain || "link"}
            </Badge>

            <Anchor
              href={item.url}
              target="_blank"
              rel="noreferrer"
              size="sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Abrir <IconExternalLink size={14} />
            </Anchor>
          </Group>

          <Text
            fw={800}
            mt={8}
            title={title}
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </Text>

          {note && (
            <Text
              mt={6}
              size="sm"
              c="dimmed"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {note}
            </Text>
          )}
        </Box>

        <Group
          gap="sm"
          align="flex-start"
          style={{ width: "100%", maxWidth: rem(360) }}
        >
          <Select
            disabled={moving}
            placeholder="Mover a…"
            data={moveOptions}
            onChange={(v) => v && onMove(v)}
            w="100%"
          />

          <Tooltip label="Eliminar" withArrow>
            <ActionIcon
              variant="default"
              disabled={moving}
              onClick={() => onDelete?.()}
              size="lg"
              radius="md"
              aria-label="Eliminar"
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {moving && (
          <Text size="xs" c="dimmed">
            Moviendo…
          </Text>
        )}
      </Group>
    </Card>
  );
}
