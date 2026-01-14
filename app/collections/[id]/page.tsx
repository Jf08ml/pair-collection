/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  Menu,
  Modal,
  Radio,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";

import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconDots,
  IconExternalLink,
  IconInfoCircle,
  IconInbox,
  IconTrash,
} from "@tabler/icons-react";

import { AuthGate } from "../../components/AuthGate";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useUser } from "../../context/UserProvider";

import { deleteCollectionDoc, listCollections } from "../../lib/collections";
import {
  deleteAllItemsInCollection,
  deleteItem,
  getDomain,
  listItemsByCollection,
  moveAllItemsToInbox,
  moveItemToCollection,
} from "../../lib/items";
import { AppLoader } from "@/app/components/AppLoader";

export default function CollectionDetailPage() {
  return (
    <AuthGate requireCouple>
      <CollectionDetailInner />
    </AuthGate>
  );
}

function CollectionDetailInner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const collectionId = params?.id;

  const { userDoc } = useUser();
  const coupleId = userDoc!.coupleId!;

  const [collections, setCollections] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // eliminar colección (modal)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"move" | "delete">("move");
  const [deleting, setDeleting] = useState(false);

  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const currentCollection = useMemo(() => {
    return collections.find((c) => c.id === collectionId) || null;
  }, [collections, collectionId]);

  async function refreshAll() {
    if (!collectionId) return;
    setLoading(true);
    setMsg(null);
    try {
      const [cols, its] = await Promise.all([
        listCollections(coupleId),
        listItemsByCollection({ coupleId, collectionId }),
      ]);
      setCollections(cols);
      setItems(its);
    } catch (e: any) {
      setMsg(e?.message || "No pude cargar la colección");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!collectionId) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, collectionId]);

  async function onMove(item: any, toCollectionId: string) {
    if (!collectionId) return;

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

      if (toCollectionId !== collectionId) {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      } else {
        await refreshAll();
      }
      setMsg("Movido ✅");
    } catch (e: any) {
      setMsg(e?.message || "No pude mover el item");
    } finally {
      setMovingId(null);
    }
  }

  async function handleDeleteCollection() {
    if (!collectionId) return;

    setDeleting(true);
    setMsg(null);
    try {
      if (deleteMode === "delete") {
        await deleteAllItemsInCollection({ coupleId, collectionId });
      } else {
        await moveAllItemsToInbox({ coupleId, collectionId });
      }

      await deleteCollectionDoc({ coupleId, collectionId });
      setDeleteOpen(false);
      router.push("/collections");
    } catch (e: any) {
      setMsg(e?.message || "No pude eliminar la colección");
    } finally {
      setDeleting(false);
    }
  }

  const title =
    currentCollection
      ? `${currentCollection.emoji || "✨"} ${currentCollection.name}`
      : "Colección";

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
          backdropFilter: "blur(10px)",
          background:
            "color-mix(in srgb, var(--mantine-color-body) 78%, transparent)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Container size={980} py="md">
          <Group justify="space-between" align="center">
            <Group gap="sm" align="center" style={{ minWidth: 0 }}>
              <Tooltip label="Volver" withArrow>
                <ActionIcon
                  variant="default"
                  radius="xl"
                  size="lg"
                  onClick={() => router.push("/collections")}
                  aria-label="Volver a colecciones"
                >
                  <IconArrowLeft size={18} />
                </ActionIcon>
              </Tooltip>

              <Box style={{ minWidth: 0 }}>
                <Title
                  order={4}
                  style={{
                    letterSpacing: -0.6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={title}
                >
                  {title}
                </Title>
              </Box>
            </Group>

            <Group gap="sm">
              <ThemeToggle />

              {/* Desktop: Inbox + Delete visibles */}
              {!isMobile && (
                <>
                  <Button
                    variant="default"
                    radius="xl"
                    leftSection={<IconInbox size={16} />}
                    onClick={() => router.push("/")}
                  >
                    Inbox
                  </Button>

                  <Button
                    color="red"
                    radius="xl"
                    leftSection={<IconTrash size={16} />}
                    onClick={() => {
                      setDeleteMode("move");
                      setDeleteOpen(true);
                    }}
                  >
                    Eliminar
                  </Button>
                </>
              )}

              {/* Mobile: menú para no saturar */}
              {isMobile && (
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="default" radius="xl" size="lg" aria-label="Opciones">
                      <IconDots size={18} />
                    </ActionIcon>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconInbox size={16} />}
                      onClick={() => router.push("/")}
                    >
                      Inbox
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => {
                        setDeleteMode("move");
                        setDeleteOpen(true);
                      }}
                    >
                      Eliminar colección
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
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

          <Card withBorder radius="xl" p="md">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={800}>Items  ({loading ? "…" : `${items.length}`})</Text>
              {loading && <Loader size="sm" />}
            </Group>

            <Divider mb="sm" />

            {loading ? (
              <AppLoader fullScreen={false} message="Cargando links…" />
            ) : items.length === 0 ? (
              <Text c="dimmed" size="sm">
                Vacío ✨
              </Text>
            ) : (
              <Stack gap="sm">
                {items.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    collections={collections}
                    currentCollectionId={collectionId!}
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
                          collectionId,
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
          </Card>
        </Stack>
      </Container>

      {/* Modal eliminar colección */}
      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        centered
        radius="lg"
        title={<Text fw={800}>Eliminar colección</Text>}
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {items.length} item(s)
          </Text>

          <Radio.Group
            value={deleteMode}
            onChange={(v) => setDeleteMode(v as "move" | "delete")}
          >
            <Stack gap="xs">
              <Radio value="move" label="Mover a Inbox" />
              <Radio value="delete" label="Borrar todo (irreversible)" />
            </Stack>
          </Radio.Group>

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button
              variant="default"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button color="red" onClick={handleDeleteCollection} loading={deleting}>
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

function ItemRow(props: {
  item: any;
  collections: any[];
  currentCollectionId: string;
  moving: boolean;
  onMove: (toCollectionId: string) => void;
  onDelete?: () => void;
}) {
  const { item, collections, currentCollectionId, moving, onMove, onDelete } = props;

  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const domain = getDomain(item.url);
  const title = item.title || domain || "Link guardado";
  const note = item.note || "";

  const moveOptions = [
    { value: "INBOX", label: "📥 Inbox" },
    ...collections.map((c) => ({
      value: c.id,
      label: `${c.emoji || "✨"} ${c.name}`,
    })),
  ];

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      style={{
        background: "var(--mantine-color-body)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 10px 24px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
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
            <Text mt={6} size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
              {note}
            </Text>
          )}
        </Box>

        {/* Acciones: desktop en fila, mobile apilado */}
        <Stack
          gap="sm"
          style={{
            width: isMobile ? "100%" : "auto",
            minWidth: isMobile ? "100%" : 320,
            maxWidth: isMobile ? "100%" : 360,
          }}
        >
          <Select
            disabled={moving}
            value={currentCollectionId}
            placeholder="Mover a…"
            data={moveOptions}
            onChange={(v) => v && onMove(v)}
            w="100%"
          />

          <Group justify="flex-end">
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
        </Stack>

        {moving && (
          <Text size="xs" c="dimmed">
            Moviendo…
          </Text>
        )}
      </Group>
    </Card>
  );
}
