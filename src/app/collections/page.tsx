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
  Flex,
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
  IconChevronRight,
} from "@tabler/icons-react";

import { AuthGate } from "../../components/AuthGate";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useUser } from "../../context/UserProvider";
import { createCollection, listCollections } from "../../lib/collections";

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

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const total = useMemo(() => collections.length, [collections]);

  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  async function refresh() {
    setLoading(true);
    try {
      const cols = await listCollections(coupleId);
      setCollections(cols);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

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
            <Group gap="sm" align="baseline" style={{ minWidth: 0 }}>
              <Title
                order={1}
                size={26}
                style={{
                  letterSpacing: -0.6,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Colecciones ✨
              </Title>
            </Group>

            <Group gap="sm">
              <ThemeToggle />

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

              {/* En desktop mostramos botón; en mobile lo convertimos en FAB */}
              {!isMobile && (
                <Button
                  radius="xl"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    setMsg(null);
                    setShowNew(true);
                  }}
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

          <Card withBorder radius="xl" p="md">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={800}>
                Tus colecciones ({loading ? "…" : `${total}`})
              </Text>
              {loading && <Loader size="sm" />}
            </Group>

            <Divider mb="sm" />

            {loading ? (
              <Text c="dimmed" size="sm">
                Cargando…
              </Text>
            ) : cols.length === 0 ? (
              <Text c="dimmed" size="sm">
                Crea una colección con “Nueva”.
              </Text>
            ) : (
              <SimpleGrid
                cols={{ base: 1, xs: 2, sm: 3, md: 4 }}
                spacing={{ base: "sm", sm: "md" }}
                verticalSpacing={{ base: "sm", sm: "md" }}
              >
                {cols.map((c) => (
                  <CollectionCard
                    key={c.id}
                    c={c}
                    onOpen={() => router.push(`/collections/${c.id}`)}
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
            onClick={() => {
              setMsg(null);
              setShowNew(true);
            }}
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
        title={<Text fw={800}>Nueva colección</Text>}
        radius="lg"
        centered
      >
        <Stack gap="sm">
          <Group gap="sm" align="flex-end" wrap={isMobile ? "wrap" : "nowrap"}>
            <TextInput
              value={emoji}
              onChange={(e) => setEmoji(e.currentTarget.value)}
              placeholder="✨"
              w={isMobile ? "100%" : 92}
              styles={{
                input: { textAlign: "center", fontSize: 18 },
              }}
            />
            <TextInput
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder='Ej: "Salidas", "Recetas", "Viajes"'
              style={{ flex: 1, width: isMobile ? "100%" : "auto" }}
            />
          </Group>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => setShowNew(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={onCreate} loading={saving} disabled={!name.trim()}>
              Crear
            </Button>
          </Group>

          <Text size="xs" c="dimmed">
            Ideas: 🍷 Salidas · 🍜 Comidas · 🧳 Viajes · 🛍️ Compras
          </Text>
        </Stack>
      </Modal>
    </Box>
  );
}

function CollectionCard({ c, onOpen }: { c: any; onOpen: () => void }) {
  const count = typeof c.itemCount === "number" ? c.itemCount : null;

  return (
    <Card
      withBorder
      radius="xl"
      p="md"
      component="button"
      onClick={onOpen}
      style={{
        textAlign: "left",
        cursor: "pointer",
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
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              border: "1px solid var(--mantine-color-default-border)",
              background:
                "color-mix(in srgb, var(--mantine-color-body) 86%, transparent)",
              flex: "0 0 auto",
              fontSize: 22,
              lineHeight: "22px",
            }}
          >
            {c.emoji || "✨"}
          </Box>

          <Box style={{ minWidth: 0 }}>
            <Text fw={800} lineClamp={1}>
              {c.name || "Sin nombre"}
            </Text>
            <Text size="sm" c="dimmed" lineClamp={1}>
              Abrir colección
            </Text>
          </Box>
        </Group>

        <Group align="center">
          <Flex gap="xs" align="center">
            {count !== null && (
              <Badge variant="light" radius="xl">
                {count}
              </Badge>
            )}
            <IconChevronRight size={18} />
          </Flex>
        </Group>
      </Group>
    </Card>
  );
}
