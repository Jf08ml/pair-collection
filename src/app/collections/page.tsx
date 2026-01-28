/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  Affix,
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
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";

import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconInfoCircle,
  IconPlus,
  IconSearch,
  IconFolderPlus,
  IconLink,
} from "@tabler/icons-react";

import { AuthGate } from "../../components/AuthGate";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useUser } from "../../context/UserProvider";
import { createCollection, listCollections } from "../../lib/collections";
import { getPreviewItemsForCollections } from "../../lib/items";
import { useLinkPreview, type LinkPreview } from "../../hooks/useLinkPreview";

export default function CollectionsPage() {
  return (
    <AuthGate requireCouple>
      <CollectionsInner />
    </AuthGate>
  );
}

function CollectionsInner() {
  const router = useRouter();
  const { fbUser, userDoc } = useUser();

  const coupleId = userDoc!.coupleId!;
  const uid = fbUser!.uid;

  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewItems, setPreviewItems] = useState<Record<string, any[]>>({});
  const [previewCache, setPreviewCache] = useState<
    Record<string, LinkPreview | null>
  >({});

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // social feel: search
  const [q, setQ] = useState("");

  const total = useMemo(() => collections.length, [collections]);

  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  async function refresh() {
    setLoading(true);
    try {
      const cols = await listCollections(coupleId);
      setCollections(cols);

      // Cargar preview items para todas las colecciones
      if (cols.length > 0) {
        const collectionIds = cols.map((c: any) => c.id);
        const previews = await getPreviewItemsForCollections({
          coupleId,
          collectionIds,
          limitPerCollection: 3,
        });
        setPreviewItems(previews);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  function openNewModal() {
    setMsg(null);
    setShowNew(true);
    // no reseteo agresivo si ya estabas escribiendo
    if (!emoji) setEmoji("✨");
  }

  async function onCreate() {
    setMsg(null);
    const n = name.trim();
    if (!n) return setMsg("Ponle un nombre a la colección.");

    setSaving(true);
    try {
      const id = await createCollection({
        coupleId,
        name: n,
        emoji: (emoji || "✨").trim(),
        createdBy: uid,
      });

      setShowNew(false);
      setName("");
      setEmoji("✨");

      await refresh();
      router.push(`/collections/${id}`);
    } catch (e: any) {
      setMsg(e?.message || "No pude crear la colección");
    } finally {
      setSaving(false);
    }
  }

  const cols = useMemo(() => {
    // orden suave: más nuevas arriba si tienes createdAt; si no, por nombre
    const copy = [...collections];
    if (copy.length && copy[0]?.createdAt) {
      copy.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
      );
    } else {
      copy.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      );
    }
    return copy;
  }, [collections]);

  const visibleCols = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return cols;
    return cols.filter((c) => {
      const hay = `${c?.name || ""} ${c?.emoji || ""}`.toLowerCase();
      return hay.includes(t);
    });
  }, [cols, q]);

  return (
    <Box
      mih="100vh"
      pb="xl"
      style={{
        background:
          "radial-gradient(1200px 600px at 18% 0%, rgba(255,105,180,0.16), transparent 55%), radial-gradient(1200px 600px at 82% 0%, rgba(99,102,241,0.12), transparent 55%), var(--mantine-color-body)",
      }}
    >
      {/* Header sticky */}
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
        <Container size={980} py="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="sm" align="center" style={{ minWidth: 0 }}>
              <Tooltip label="Volver al Inbox" withArrow>
                <ActionIcon
                  variant="default"
                  radius="xl"
                  size="lg"
                  onClick={() => router.push("/")}
                  aria-label="Volver"
                >
                  <IconArrowLeft size={18} />
                </ActionIcon>
              </Tooltip>

              <Box style={{ minWidth: 0 }}>
                <Group gap="xs" align="baseline" wrap="nowrap">
                  <Title
                    order={1}
                    size={24}
                    style={{
                      letterSpacing: -0.6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Colecciones
                  </Title>
                </Group>
              </Box>
            </Group>

            <Group gap="sm">
              <ThemeToggle />

              {!isMobile && (
                <Button
                  radius="xl"
                  leftSection={<IconPlus size={16} />}
                  onClick={openNewModal}
                >
                  Nueva
                </Button>
              )}
            </Group>
          </Group>
        </Container>
      </Box>

      <Container size={980} mt="lg">
        <Stack gap="md">
          {msg && (
            <Alert
              radius="lg"
              variant="light"
              icon={<IconInfoCircle size={16} />}
            >
              {msg}
            </Alert>
          )}

          {/* Search + hint row (social explore feel) */}
          <Card
            withBorder
            radius="xl"
            p="md"
            style={{
              background:
                "color-mix(in srgb, var(--mantine-color-body) 92%, transparent)",
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Text fw={900}>
                Explorar{" "}
                <Badge variant="light">
                  {visibleCols.length}/{loading ? "…" : total} visibles
                </Badge>
              </Text>

              <Group gap="xs" align="center">
                {loading && <Loader size="sm" />}
              </Group>
            </Group>

            <Divider my="sm" />

            <TextInput
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              placeholder='Buscar… (ej: "Viajes", "🍜", "Compras")'
              leftSection={<IconSearch size={16} />}
              radius="xl"
            />
          </Card>

          {/* Grid */}
          <Card withBorder radius="xl" p="md">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={900}>Tus colecciones</Text>
              {!loading && cols.length === 0 && (
                <Button
                  radius="xl"
                  variant="light"
                  leftSection={<IconFolderPlus size={16} />}
                  onClick={openNewModal}
                >
                  Crear la primera
                </Button>
              )}
            </Group>

            <Divider mb="sm" />

            {loading ? (
              <Stack align="center" py="xl" gap="sm">
                <Loader />
                <Text c="dimmed" size="sm">
                  Cargando…
                </Text>
              </Stack>
            ) : visibleCols.length === 0 ? (
              <Card withBorder radius="xl" p="lg">
                <Stack gap="xs">
                  <Text fw={900}>No encontré colecciones con “{q.trim()}”</Text>
                  <Text c="dimmed" size="sm">
                    Prueba otro término o crea una nueva.
                  </Text>
                  <Group mt="xs">
                    <Button
                      radius="xl"
                      onClick={() => setQ("")}
                      variant="default"
                    >
                      Limpiar búsqueda
                    </Button>
                    <Button
                      radius="xl"
                      onClick={openNewModal}
                      leftSection={<IconPlus size={16} />}
                    >
                      Nueva
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ) : (
              <SimpleGrid
                cols={{ base: 2 }}
                spacing={{ base: "sm", sm: "md" }}
                verticalSpacing={{ base: "sm", sm: "md" }}
              >
                {visibleCols.map((c) => (
                  <CollectionCard
                    key={c.id}
                    c={c}
                    onOpen={() => router.push(`/collections/${c.id}`)}
                    previewItems={previewItems[c.id] || []}
                    previewCache={previewCache}
                    setPreviewCache={setPreviewCache}
                  />
                ))}
              </SimpleGrid>
            )}
          </Card>
        </Stack>
      </Container>

      {/* FAB en mobile */}
      {isMobile && (
        <Affix position={{ bottom: 100, right: 18 }}>
          <ActionIcon
            size="xl"
            radius="xl"
            variant="filled"
            onClick={openNewModal}
            aria-label="Nueva colección"
          >
            <IconPlus size={22} />
          </ActionIcon>
        </Affix>
      )}

      {/* Modal Nueva colección */}
      <Modal
        opened={showNew}
        onClose={() => setShowNew(false)}
        title={
          <Group gap="sm">
            <IconFolderPlus size={18} />
            <Text fw={900}>Nueva colección</Text>
          </Group>
        }
        radius="lg"
        centered
      >
        <Stack gap="sm">
          <Text c="dimmed" size="sm">
            Esto es como crear un “board”. Luego mueves links aquí.
          </Text>

          <Group gap="sm" align="stretch" wrap={isMobile ? "wrap" : "nowrap"}>
            {/* Emoji preview big (social) */}
            <Box
              style={{
                width: isMobile ? "100%" : 96,
                height: 96,
                borderRadius: 22,
                display: "grid",
                placeItems: "center",
                border: "1px solid var(--mantine-color-default-border)",
                background:
                  "radial-gradient(300px 140px at 30% 0%, rgba(255,105,180,0.18), transparent 60%), radial-gradient(300px 140px at 70% 0%, rgba(99,102,241,0.14), transparent 60%), color-mix(in srgb, var(--mantine-color-body) 88%, transparent)",
                fontSize: 34,
                lineHeight: "34px",
              }}
            >
              {(emoji || "✨").trim() || "✨"}
            </Box>

            <Stack
              gap="sm"
              style={{ flex: 1, width: isMobile ? "100%" : "auto" }}
            >
              <TextInput
                value={emoji}
                onChange={(e) => setEmoji(e.currentTarget.value)}
                label="Emoji"
                placeholder="✨"
                styles={{ input: { textAlign: "center", fontSize: 18 } }}
                radius="lg"
                disabled={saving}
              />

              <TextInput
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                label="Nombre"
                placeholder='Ej: "Salidas", "Recetas", "Viajes"'
                radius="lg"
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreate();
                }}
              />
            </Stack>
          </Group>

          <Group justify="space-between" align="center" wrap="wrap">
            <Text size="xs" c="dimmed">
              Ideas: 🍷 Salidas · 🍜 Comidas · 🧳 Viajes · 🛍️ Compras
            </Text>

            <Group gap="sm">
              <Button
                variant="default"
                onClick={() => setShowNew(false)}
                disabled={saving}
                radius="xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={onCreate}
                loading={saving}
                disabled={!name.trim()}
                radius="xl"
              >
                Crear
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

function CollectionCard({
  c,
  onOpen,
  previewItems,
  previewCache,
  setPreviewCache,
}: {
  c: any;
  onOpen: () => void;
  previewItems: any[];
  previewCache: Record<string, LinkPreview | null>;
  setPreviewCache: React.Dispatch<
    React.SetStateAction<Record<string, LinkPreview | null>>
  >;
}) {
  const count = typeof c.itemCount === "number" ? c.itemCount : null;

  return (
    <Card
      withBorder
      p={0}
      component="button"
      onClick={onOpen}
      style={{
        textAlign: "left",
        cursor: "pointer",
        overflow: "hidden",
        background:
          "color-mix(in srgb, var(--mantine-color-body) 92%, transparent)",
        transition: "transform 140ms ease, box-shadow 140ms ease",
      }}
      styles={{
        root: {
          ":hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 12px 26px rgba(0,0,0,0.08)",
          },
          ":active": {
            transform: "translateY(0px)",
          },
        },
      }}
    >
      {/* Cover (social board style) */}
      <Box
        style={{
          height: 84,
          padding: 14,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background:
            "radial-gradient(420px 160px at 18% 0%, rgba(255,105,180,0.20), transparent 58%), radial-gradient(420px 160px at 82% 0%, rgba(99,102,241,0.16), transparent 58%), color-mix(in srgb, var(--mantine-color-body) 86%, transparent)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          position: "relative",
        }}
      >
        {/* Thumbnails de preview - se muestran detrás del emoji */}
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            gap: 4,
            padding: 6,
            overflow: "hidden",
          }}
        >
          {previewItems.slice(0, 3).map((item) => (
            <PreviewThumbnail
              key={item.id}
              url={item.url}
              total={Math.min(previewItems.length, 3)}
              previewCache={previewCache}
              setPreviewCache={setPreviewCache}
            />
          ))}
        </Box>
      </Box>

      {/* Body */}
      <Box p="xs">
        <Text fw={900} lineClamp={2}>
          {c.name || "Sin nombre"} ({count !== null ? count : "…"})
        </Text>
      </Box>
    </Card>
  );
}

/** Thumbnail individual para preview de colección */
function PreviewThumbnail({
  url,
  total,
  previewCache,
  setPreviewCache,
}: {
  url: string;
  total: number;
  previewCache: Record<string, LinkPreview | null>;
  setPreviewCache: React.Dispatch<
    React.SetStateAction<Record<string, LinkPreview | null>>
  >;
}) {
  const preview = useLinkPreview(url, previewCache, setPreviewCache);
  const imageUrl = preview?.image;

  // Calcular el ancho según cuántas thumbnails hay
  const widthPercent = total === 1 ? 100 : total === 2 ? 50 : 33.33;

  return (
    <Box
      style={{
        flex: `0 0 ${widthPercent}%`,
        height: "100%",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--mantine-color-dark-6)",
        opacity: 0.85,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Box
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            background: "var(--mantine-color-dark-7)",
          }}
        >
          <IconLink size={16} style={{ opacity: 0.3 }} />
        </Box>
      )}
    </Box>
  );
}
