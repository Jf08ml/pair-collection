/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  Menu,
  Modal,
  Radio,
  SegmentedControl,
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
  IconDots,
  IconInfoCircle,
  IconInbox,
  IconTrash,
  IconSearch,
  IconArrowsRightLeft,
  IconCheck,
  IconClock,
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
  toggleItemStatus,
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

  const { fbUser, userDoc } = useUser();
  const coupleId = userDoc!.coupleId!;
  const uid = fbUser!.uid;

  const [collections, setCollections] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, LinkPreview | null>>(
    {},
  );

  // filtros
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">(
    "all",
  );
  const [q, setQ] = useState("");

  // eliminar colección (modal)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"move" | "delete">("move");
  const [deleting, setDeleting] = useState(false);

  // mover todo a inbox (modal confirm)
  const [moveAllOpen, setMoveAllOpen] = useState(false);
  const [movingAll, setMovingAll] = useState(false);

  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const currentCollection = useMemo(() => {
    return collections.find((c) => c.id === collectionId) || null;
  }, [collections, collectionId]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((x) => x.status === "done").length;
    const pending = items.filter((x) => x.status !== "done").length;
    return { total, pending, done };
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (statusFilter !== "all") {
      list = list.filter((it) => it.status === statusFilter);
    }

    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter((it) => {
        const hay = `${it?.title || ""} ${it?.url || ""} ${it?.note || ""}`.toLowerCase();
        return hay.includes(t);
      });
    }

    return list;
  }, [items, statusFilter, q]);

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

  async function handleToggleStatus(item: any) {
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

  async function handleMoveAllToInbox() {
    if (!collectionId) return;
    setMovingAll(true);
    setMsg(null);
    try {
      await moveAllItemsToInbox({ coupleId, collectionId });
      setMoveAllOpen(false);
      await refreshAll();
      setMsg("Movidos a Inbox ✅");
    } catch (e: any) {
      setMsg(e?.message || "No pude mover todo a Inbox");
    } finally {
      setMovingAll(false);
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
          backdropFilter: "blur(12px)",
          background:
            "color-mix(in srgb, var(--mantine-color-body) 78%, transparent)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Container size={980} py="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
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

                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <Button variant="default" radius="xl" leftSection={<IconDots size={16} />}>
                        Acciones
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconArrowsRightLeft size={16} />}
                        onClick={() => setMoveAllOpen(true)}
                      >
                        Mover todo a Inbox
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
                </>
              )}

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
                      leftSection={<IconArrowsRightLeft size={16} />}
                      onClick={() => setMoveAllOpen(true)}
                    >
                      Mover todo a Inbox
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

          {/* Hero / controls */}
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
              <Group gap="xs" wrap="wrap">
                <Badge variant="light" radius="xl" leftSection={<IconClock size={14} />}>
                  Pendientes: {loading ? "…" : stats.pending}
                </Badge>
                <Badge variant="light" radius="xl" leftSection={<IconCheck size={14} />}>
                  Hechos: {loading ? "…" : stats.done}
                </Badge>
              </Group>

              <Group gap="sm" align="center">
                {loading && <Loader size="sm" />}
              </Group>
            </Group>

            <Divider my="sm" />

            <TextInput
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              placeholder='Buscar en esta colección… (título, link, nota)'
              leftSection={<IconSearch size={16} />}
              radius="xl"
            />

            <Group justify="space-between" align="center" mt="sm" wrap="wrap" gap="sm">
              <SegmentedControl
                size="xs"
                radius="xl"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as "all" | "pending" | "done")}
                data={[
                  { value: "all", label: `Todos` },
                  { value: "pending", label: `Pendientes` },
                  { value: "done", label: `Hechos` },
                ]}
              />

              <Text size="sm" c="dimmed">
                {loading ? "…" : `${filteredItems.length} visibles`}
              </Text>
            </Group>
          </Card>

          {/* Feed */}
          <Card withBorder radius="xl" p="md">
            {loading ? (
              <AppLoader fullScreen={false} message="Cargando links…" />
            ) : filteredItems.length === 0 ? (
              <Card withBorder radius="xl" p="lg">
                <Stack gap="xs">
                  <Text fw={900}>
                    {q.trim()
                      ? "No hay resultados con ese filtro"
                      : statusFilter === "all"
                        ? "Esta colección está vacía ✨"
                        : "No hay items en este estado"}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {q.trim()
                      ? "Prueba con otra palabra o limpia la búsqueda."
                      : "Guarda links en Inbox y muévelos aquí."}
                  </Text>
                  <Group mt="xs" wrap="wrap">
                    {q.trim() && (
                      <Button radius="xl" variant="default" onClick={() => setQ("")}>
                        Limpiar búsqueda
                      </Button>
                    )}
                    <Button
                      radius="xl"
                      onClick={() => router.push("/")}
                      leftSection={<IconInbox size={16} />}
                    >
                      Ir al Inbox
                    </Button>
                  </Group>
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
                    includeInboxInMove
                    currentCollectionId={collectionId!}
                    previewCache={previews}
                    setPreviewCache={setPreviews}
                    coupleId={coupleId}
                    currentUserId={uid}
                    onMove={(toId) => onMove(it, toId)}
                    onToggleStatus={() => handleToggleStatus(it)}
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

      {/* Modal mover todo a Inbox */}
      <Modal
        opened={moveAllOpen}
        onClose={() => setMoveAllOpen(false)}
        centered
        radius="lg"
        title={<Text fw={900}>Mover todo a Inbox</Text>}
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Esto moverá <b>{items.length}</b> item(s) a Inbox. La colección se queda creada.
          </Text>
          <Group justify="flex-end" gap="sm" mt="xs">
            <Button
              variant="default"
              onClick={() => setMoveAllOpen(false)}
              disabled={movingAll}
              radius="xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMoveAllToInbox}
              loading={movingAll}
              radius="xl"
            >
              Mover
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal eliminar colección */}
      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        centered
        radius="lg"
        title={<Text fw={900}>Eliminar colección</Text>}
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Esta colección tiene <b>{items.length}</b> item(s).
          </Text>

          <Radio.Group
            value={deleteMode}
            onChange={(v) => setDeleteMode(v as "move" | "delete")}
          >
            <Stack gap="xs">
              <Radio value="move" label="Mover items a Inbox y eliminar colección" />
              <Radio value="delete" label="Borrar todo (irreversible)" />
            </Stack>
          </Radio.Group>

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button
              variant="default"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              radius="xl"
            >
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={handleDeleteCollection}
              loading={deleting}
              radius="xl"
            >
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
