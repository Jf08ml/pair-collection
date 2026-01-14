"use client";

import { useEffect, useMemo, useState } from "react";
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
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconHeart, IconPencil, IconUser } from "@tabler/icons-react";

import { useUser } from "../context/UserProvider"; // ajusta
import { usePublicProfile } from "../lib/usePublicProfile"; // ajusta
import { AppLoader } from "../components/AppLoader"; // ajusta

function initials(name?: string | null) {
  if (!name) return "♡";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function AccountPage() {
  const { fbUser, userDoc, loading: userLoading } = useUser();
  const uid = fbUser?.uid ?? null;

  const {
    profile,
    loading: profileLoading,
    updateNickname,
  } = usePublicProfile(uid);

  const loading = userLoading || profileLoading;

  const [opened, setOpened] = useState(false);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);

  const displayName = useMemo(
    () => userDoc?.displayName ?? fbUser?.displayName ?? "Mi cuenta",
    [userDoc?.displayName, fbUser?.displayName]
  );

  const photoURL = useMemo(
    () => userDoc?.photoURL ?? fbUser?.photoURL ?? null,
    [userDoc?.photoURL, fbUser?.photoURL]
  );

  const email = useMemo(
    () => userDoc?.email ?? fbUser?.email ?? null,
    [userDoc?.email, fbUser?.email]
  );

  const currentNickname = profile?.nickname ?? null;

  useEffect(() => {
    // cuando cargue el profile, precarga el input
    setNickname(currentNickname ?? "");
  }, [currentNickname]);

  if (loading) return <AppLoader message="Cargando cuenta…" fullScreen />;

  return (
    <Box
      style={{
        minHeight: "calc(100vh - var(--app-shell-header-height, 0px))",
        background:
          "radial-gradient(1100px 520px at 20% 0%, rgba(255,105,180,0.16), transparent 55%), radial-gradient(1100px 520px at 80% 0%, rgba(99,102,241,0.12), transparent 55%), var(--mantine-color-body)",
      }}
    >
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <ActionIcon
                variant="light"
                radius="xl"
                aria-label="account"
                color="indigo"
              >
                <IconUser size={18} />
              </ActionIcon>
              <Title order={2}>Mi cuenta</Title>
            </Group>

            <Badge
              variant="light"
              radius="xl"
              leftSection={<IconHeart size={14} />}
            >
              Perfil
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
            <Stack gap="lg">
              <Group align="center" justify="space-between" wrap="wrap">
                <Group gap="md">
                  <Avatar
                    radius="xl"
                    size={72}
                    src={photoURL ?? undefined}
                    variant="light"
                    color="pink"
                  >
                    {initials(displayName)}
                  </Avatar>
                  <Stack gap={2}>
                    <Title order={3}>{displayName}</Title>
                    <Text size="sm" c="dimmed">
                      {email ?? "Sin email"}
                    </Text>
                  </Stack>
                </Group>

                <Button
                  radius="xl"
                  variant="light"
                  leftSection={<IconPencil size={18} />}
                  onClick={() => setOpened(true)}
                >
                  Editar apodo
                </Button>
              </Group>

              <Divider opacity={0.35} />

              <Group justify="space-between" wrap="wrap">
                <Stack gap={2}>
                  <Text size="sm" c="dimmed">
                    Apodo
                  </Text>
                  <Text fw={600}>{currentNickname ?? "—"}</Text>
                </Stack>

                <Stack gap={2}>
                  <Text size="sm" c="dimmed">
                    Estado
                  </Text>
                  <Text fw={600}>
                    {userDoc?.coupleId ? "En pareja" : "Sin pareja"}
                  </Text>
                </Stack>
              </Group>

              <Text size="xs" c="dimmed">
                El apodo es lo que verá tu pareja en la vista “Mi pareja”.
              </Text>
            </Stack>
          </Card>
        </Stack>

        <Modal
          opened={opened}
          onClose={() => {
            setNickname(currentNickname ?? "");
            setOpened(false);
          }}
          centered
          radius="lg"
          title="Editar apodo"
        >
          <Stack>
            <TextInput
              label="Apodo"
              placeholder="Ej: Pipe, Amor, Gordi…"
              value={nickname}
              onChange={(e) => setNickname(e.currentTarget.value)}
              maxLength={24}
              description="Máximo 24 caracteres. Puedes dejarlo vacío para quitarlo."
            />

            <Group justify="flex-end">
              <Button
                variant="default"
                radius="xl"
                onClick={() => {
                  setNickname(currentNickname ?? "");
                  setOpened(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                radius="xl"
                loading={saving}
                onClick={async () => {
                  try {
                    setSaving(true);
                    await updateNickname(nickname);
                    setOpened(false);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Guardar
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Container>
    </Box>
  );
}
