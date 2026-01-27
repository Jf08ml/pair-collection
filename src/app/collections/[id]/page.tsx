/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ActionIcon,
  Alert,
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
  IconInfoCircle,
  IconInbox,
  IconTrash,
} from "@tabler/icons-react";

import { AuthGate } from "../../../components/AuthGate";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { useUser } from "../../../context/UserProvider";

import { deleteCollectionDoc, listCollections } from "../../../lib/collections";
import {
  deleteAllItemsInCollection,
  deleteItem,
  listItemsByCollection,
  moveAllItemsToInbox,
  moveItemToCollection,
} from "../../../lib/items";
import { AppLoader } from "../../../components/AppLoader";
import { LinkItemCard } from "@/src/components/LinkItemCard";
export default function CollectionDetailPage() {
  return (
    <AuthGate requireCouple>
      <CollectionDetailInner />
    </AuthGate>
  );
}

type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

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
  const [previews, setPreviews] = useState<Record<string, LinkPreview | null>>(
    {},
  );

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

  const title = currentCollection
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
                    <ActionIcon
                      variant="default"
                      radius="xl"
                      size="lg"
                      aria-label="Opciones"
                    >
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
              <Text fw={800}>Items ({loading ? "…" : `${items.length}`})</Text>
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
                  <LinkItemCard
                    key={it.id}
                    item={it}
                    collections={collections}
                    moving={movingId === it.id}
                    includeInboxInMove
                    currentCollectionId={collectionId!}
                    previewCache={previews}
                    setPreviewCache={setPreviews}
                    onMove={(toId) => onMove(it, toId)}
                    onDelete={async () => {
                      if (!window.confirm("¿Eliminar este link?")) return;

                      setMovingId(it.id);
                      try {
                        await deleteItem({
                          coupleId,
                          itemId: it.id,
                          collectionId,
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
            <Button
              color="red"
              onClick={handleDeleteCollection}
              loading={deleting}
            >
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
