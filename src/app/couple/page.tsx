"use client";

import { useMemo } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconHeart,
  IconLink,
  IconPencil,
  IconSparkles,
} from "@tabler/icons-react";

import { useUser } from "../../context/UserProvider"; // ajusta ruta
import { useCouplePublicProfiles } from "../../lib/couplePublic";
import { AppLoader } from "../../components/AppLoader"; // ajusta ruta

function initials(name?: string | null) {
  if (!name) return "♡";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function displayNameFromProfile(profile?: {
  nickname?: string | null;
  displayName?: string | null;
} | null) {
  return profile?.nickname?.trim() || profile?.displayName?.trim() || null;
}

export default function CouplePage() {
  const { fbUser, userDoc, loading: userLoading } = useUser();
  const coupleId = userDoc?.coupleId ?? null;

  const {
    couple,
    profiles,
    loading: coupleLoading,
  } = useCouplePublicProfiles(coupleId);

  const loading = userLoading || coupleLoading;

  const me = useMemo(() => {
    if (!fbUser) return null;
    return profiles.find((p) => p.uid === fbUser.uid) ?? null;
  }, [profiles, fbUser]);

  const partner = useMemo(() => {
    if (!fbUser) return null;
    return profiles.find((p) => p.uid !== fbUser.uid) ?? null;
  }, [profiles, fbUser]);

  const meName = displayNameFromProfile(me) ?? userDoc?.displayName ?? "Tú";
  const partnerName = displayNameFromProfile(partner) ?? "Tu pareja";

  if (loading) return <AppLoader message="Cargando pareja…" fullScreen />;

  if (!coupleId) {
    return (
      <Container size="sm" py="xl">
        <Card radius="xl" withBorder p="xl">
          <Stack gap="sm">
            <Title order={3}>Aún no tienes pareja vinculada</Title>
            <Text c="dimmed" size="sm">
              Vincula tu pareja con un código de invitación para ver esta
              sección.
            </Text>
            <Button radius="xl" leftSection={<IconLink size={18} />}>
              Vincular pareja
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Box
      style={{
        minHeight: "calc(100vh - var(--app-shell-header-height, 0px))",
        background:
          "radial-gradient(1100px 520px at 20% 0%, rgba(255,105,180,0.18), transparent 55%), radial-gradient(1100px 520px at 80% 0%, rgba(99,102,241,0.14), transparent 55%), var(--mantine-color-body)",
      }}
    >
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <ActionIcon
                variant="light"
                radius="xl"
                aria-label="love"
                color="pink"
              >
                <IconHeart size={18} />
              </ActionIcon>
              <Title order={2}>Mi pareja</Title>
            </Group>

            <Badge
              variant="light"
              radius="xl"
              leftSection={<IconSparkles size={14} />}
            >
              Conectados
            </Badge>
          </Group>

          <Card
            radius="xl"
            withBorder
            p="xl"
            style={{
              backdropFilter: "blur(10px)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            <Stack gap="lg" align="center">
              <Group gap="sm" align="center">
                <Avatar
                  radius="xl"
                  size={64}
                  variant="light"
                  color="pink"
                  src={me?.photoURL ?? undefined}
                >
                  {initials(meName)}
                </Avatar>

                <Box
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "linear-gradient(135deg, rgba(255,105,180,0.25), rgba(99,102,241,0.18))",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  <IconHeart size={18} />
                </Box>

                <Avatar
                  radius="xl"
                  size={64}
                  variant="light"
                  color="indigo"
                  src={partner?.photoURL ?? undefined}
                >
                  {initials(partnerName)}
                </Avatar>
              </Group>

              <Stack gap={4} align="center">
                <Title order={3} style={{ textAlign: "center" }}>
                  {meName} <span style={{ opacity: 0.75 }}>y</span>{" "}
                  {partnerName}
                </Title>

                <Text size="sm" c="dimmed" style={{ textAlign: "center" }}>
                  {couple?.title ??
                    "“Guarden lo que aman, recuerden lo que sueñan, y construyan lo que viene.”"}
                </Text>
              </Stack>

              <Divider w="100%" opacity={0.35} />

              <Group justify="center" gap="sm" wrap="wrap">
                <Button
                  radius="xl"
                  variant="light"
                  leftSection={<IconLink size={18} />}
                >
                  Copiar link / Invitar
                </Button>
                <Button
                  radius="xl"
                  variant="default"
                  leftSection={<IconPencil size={18} />}
                >
                  Editar detalles
                </Button>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
