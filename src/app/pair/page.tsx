/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Alert,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  Code,
  CopyButton,
  rem,
} from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconInfoCircle,
} from "@tabler/icons-react";

import { useUser } from "../../context/UserProvider";
import { createInvite, joinWithCode } from "../../lib/invites";
import { AppLoader } from "../../components/AppLoader";

export default function PairPage() {
  const router = useRouter();
  const { fbUser, userDoc, loading } = useUser();

  // UI state
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [msg, setMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const hasCouple = !!userDoc?.coupleId;

  useEffect(() => {
    if (loading) return;

    if (!fbUser) {
      router.replace("/login");
      return;
    }

    if (hasCouple) {
      router.replace("/"); // ya tiene pareja
    }
  }, [loading, fbUser, hasCouple, router]);

  useEffect(() => {
    if (userDoc?.pendingInviteCode) setInviteCode(userDoc.pendingInviteCode);
  }, [userDoc?.pendingInviteCode]);

  const cleanInput = useMemo(
    () => inputCode.replace(/\D/g, "").slice(0, 6),
    [inputCode]
  );

  async function handleCreateCode() {
    if (!fbUser) return;
    setMsg(null);
    setCreating(true);
    try {
      const res = await createInvite(
        fbUser.uid,
        fbUser.displayName || undefined
      );
      setInviteCode(res.code);
      setMsg({ type: "success", text: "Código generado ✅" });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Error creando el código." });
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!fbUser) return;
    setMsg(null);
    setJoining(true);
    try {
      const { coupleId } = await joinWithCode(fbUser.uid, cleanInput);
      setMsg({
        type: "success",
        text: `¡Listo! Pareja creada ✅ (${coupleId})`,
      });
      router.replace("/");
    } catch (e: any) {
      setMsg({
        type: "error",
        text: e?.message || "No se pudo unir con ese código.",
      });
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <AppLoader />
      </main>
    );
  }

  // fondo “bonito” similar al que ya estás usando en AppLoader
  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <main style={pageStyle}>
        <Container size={520} px="md" w="100%">
          {children}
        </Container>
      </main>
    );
  }

  // Si no hay usuario, el useEffect redirige a /login
  if (!fbUser) {
    return (
      <main style={pageStyle}>
        <AppLoader />
      </main>
    );
  }

  return (
    <Shell>
      <Card
        withBorder
        radius="xl"
        p="lg"
        style={{
          background: "rgba(20,20,32,.92)",
          borderColor: "rgba(255,255,255,.10)",
          boxShadow: "0 18px 60px rgba(0,0,0,.45)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Stack gap="md">
          <Stack gap={4}>
            <Title order={2} style={{ letterSpacing: -0.3 }}>
              Vincular pareja
            </Title>
            <Text c="dimmed">
              Crea un código de <b>6 dígitos</b> o únete con uno.
            </Text>
          </Stack>

          {/* CREAR */}
          <Stack gap="xs">
            <Title order={4}>Crear código</Title>

            <Button
              radius="lg"
              size="md"
              loading={creating}
              onClick={handleCreateCode}
            >
              Generar código
            </Button>

            {inviteCode && (
              <Card
                radius="lg"
                p="md"
                withBorder
                style={{
                  background: "rgba(15,15,24,.75)",
                  borderColor: "rgba(255,255,255,.10)",
                }}
              >
                <Stack gap="sm">
                  <Group justify="center">
                    <Code
                      style={{
                        fontSize: rem(32),
                        letterSpacing: rem(6),
                        fontWeight: 800,
                        padding: `${rem(10)} ${rem(14)}`,
                        borderRadius: rem(14),
                        background: "rgba(255,255,255,.06)",
                      }}
                    >
                      {inviteCode}
                    </Code>
                  </Group>

                  <Group grow>
                    <CopyButton value={inviteCode} timeout={1200}>
                      {({ copied, copy }) => (
                        <Button
                          onClick={() => {
                            copy();
                            setMsg({
                              type: "success",
                              text: "Código copiado ✅",
                            });
                          }}
                          radius="lg"
                          variant="light"
                          leftSection={
                            copied ? (
                              <IconCheck size={18} />
                            ) : (
                              <IconCopy size={18} />
                            )
                          }
                        >
                          {copied ? "Copiado" : "Copiar"}
                        </Button>
                      )}
                    </CopyButton>

                    <Button
                      radius="lg"
                      variant="default"
                      onClick={() => {
                        setInviteCode(null);
                        setMsg(null);
                      }}
                    >
                      Nuevo
                    </Button>
                  </Group>

                  <Text size="sm" c="dimmed">
                    En MVP puedes decirle el código a tu pareja (WhatsApp, chat,
                    etc.).
                  </Text>
                </Stack>
              </Card>
            )}
          </Stack>

          <Divider opacity={0.25} />

          {/* UNIRSE */}
          <Stack gap="xs">
            <Title order={4}>Tengo un código</Title>

            <TextInput
              value={inputCode}
              onChange={(e) => setInputCode(e.currentTarget.value)}
              inputMode="numeric"
              placeholder="Ej: 123456"
              maxLength={6}
              radius="lg"
              size="md"
              styles={{
                input: {
                  letterSpacing: rem(3),
                  fontWeight: 700,
                  background: "rgba(15,15,24,.75)",
                  borderColor: "rgba(255,255,255,.10)",
                },
              }}
            />

            <Button
              radius="lg"
              size="md"
              onClick={handleJoin}
              loading={joining}
              disabled={cleanInput.length !== 6}
            >
              Unirme
            </Button>
          </Stack>

          {msg && (
            <Alert
              radius="lg"
              variant="light"
              color={
                msg.type === "error"
                  ? "red"
                  : msg.type === "success"
                  ? "green"
                  : "blue"
              }
              icon={<IconInfoCircle size={18} />}
              title={
                msg.type === "error"
                  ? "Ups"
                  : msg.type === "success"
                  ? "Listo"
                  : "Info"
              }
            >
              {msg.text}
            </Alert>
          )}
        </Stack>
      </Card>
    </Shell>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 20,
  color: "white",
  background:
    "radial-gradient(1200px 600px at 18% 0%, rgba(255,105,180,0.16), transparent 55%), radial-gradient(1200px 600px at 82% 0%, rgba(99,102,241,0.12), transparent 55%), #0b0b0f",
};
