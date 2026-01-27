"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { useUser } from "../../../context/UserProvider";

import {
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Image,
  Loader,
  Stack,
  Text,
  TextInput,
  PasswordInput,
  Tabs,
  Title,
  Alert,
} from "@mantine/core";
import { IconBrandGoogle, IconHeart, IconMail, IconAlertCircle } from "@tabler/icons-react";

function FullScreenLoading({ message = "Verificando sesión…" }: { message?: string }) {
  return (
    <Box
      mih="100vh"
      style={{
        background:
          "radial-gradient(1200px 600px at 18% 0%, rgba(255,105,180,0.16), transparent 55%), radial-gradient(1200px 600px at 82% 0%, rgba(99,102,241,0.12), transparent 55%), var(--mantine-color-body)",
      }}
    >
      <Center mih="100vh" px="md">
        <Stack align="center" gap="sm">
          <Image src="/logo.png" alt="Pair Collection" w={72} h={72} radius="lg" />
          <Loader />
          <Text size="sm" c="dimmed" ta="center">
            {message}
          </Text>
        </Stack>
      </Center>
    </Box>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { fbUser, userDoc, loading } = useUser();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (fbUser) {
      if (userDoc?.coupleId) router.replace("/");
      else router.replace("/pair");
    }
  }, [loading, fbUser, userDoc?.coupleId, router]);

  function clearMessages() {
    setError(null);
    setResetSent(false);
  }

  async function loginGoogle() {
    try {
      clearMessages();
      setIsSigningIn(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(msg);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function loginEmail() {
    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }
    try {
      clearMessages();
      setIsSigningIn(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Email o contraseña incorrectos");
      } else if (code === "auth/invalid-email") {
        setError("Email inválido");
      } else {
        setError("Error al iniciar sesión");
      }
    } finally {
      setIsSigningIn(false);
    }
  }

  async function registerEmail() {
    if (!email || !password || !name) {
      setError("Por favor completa todos los campos");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    try {
      clearMessages();
      setIsSigningIn(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        setError("Este email ya está registrado");
      } else if (code === "auth/invalid-email") {
        setError("Email inválido");
      } else if (code === "auth/weak-password") {
        setError("La contraseña es muy débil");
      } else {
        setError("Error al crear cuenta");
      }
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setError("Ingresa tu email para recuperar la contraseña");
      return;
    }
    try {
      clearMessages();
      setIsSigningIn(true);
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setShowReset(false);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/user-not-found") {
        setError("No existe una cuenta con este email");
      } else if (code === "auth/invalid-email") {
        setError("Email inválido");
      } else {
        setError("Error al enviar email de recuperación");
      }
    } finally {
      setIsSigningIn(false);
    }
  }

  // ✅ Loader de sesión (antes de mostrar el login)
  if (loading) return <FullScreenLoading />;

  // Si ya hay usuario, normalmente el useEffect redirige; esto evita “flash” del login.
  if (fbUser) return <FullScreenLoading message="Entrando…" />;

  return (
    <Box
      mih="100vh"
      style={{
        background:
          "radial-gradient(1200px 600px at 18% 0%, rgba(255,105,180,0.16), transparent 55%), radial-gradient(1200px 600px at 82% 0%, rgba(99,102,241,0.12), transparent 55%), var(--mantine-color-body)",
      }}
    >
      <Container size={420} py={40}>
        <Center mih="calc(100vh - 80px)">
          <Card
            withBorder
            radius="xl"
            p="lg"
            shadow="sm"
            style={{
              width: "100%",
              backdropFilter: "blur(10px)",
              backgroundColor:
                "color-mix(in srgb, var(--mantine-color-body) 88%, transparent)",
            }}
          >
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <Image src="/logo.png" alt="Pair Collection" w={44} h={44} radius="md" />
                  <Box>
                    <Title order={3} lh={1.1}>
                      Pair Collection
                    </Title>
                    <Text size="sm" c="dimmed">
                      Guarda y comparte tus cosas favoritas en pareja
                    </Text>
                  </Box>
                </Group>
                <IconHeart size={18} />
              </Group>

              <Divider />

              {error && (
                <Alert color="red" icon={<IconAlertCircle size={16} />} radius="md">
                  {error}
                </Alert>
              )}

              {resetSent && (
                <Alert color="green" radius="md">
                  Te enviamos un email para recuperar tu contraseña
                </Alert>
              )}

              {showReset ? (
                <Stack gap="sm">
                  <Text fw={600}>Recuperar contraseña</Text>
                  <Text size="sm" c="dimmed">
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </Text>
                  <TextInput
                    label="Email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                    leftSection={<IconMail size={16} />}
                    radius="md"
                  />
                  <Group grow>
                    <Button
                      variant="default"
                      radius="lg"
                      onClick={() => {
                        setShowReset(false);
                        clearMessages();
                      }}
                    >
                      Volver
                    </Button>
                    <Button
                      radius="lg"
                      onClick={handleResetPassword}
                      loading={isSigningIn}
                    >
                      Enviar email
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <Tabs value={activeTab} onChange={setActiveTab}>
                  <Tabs.List grow mb="md">
                    <Tabs.Tab value="login">Iniciar sesión</Tabs.Tab>
                    <Tabs.Tab value="register">Crear cuenta</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="login">
                    <Stack gap="sm">
                      <TextInput
                        label="Email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                        leftSection={<IconMail size={16} />}
                        radius="md"
                      />
                      <PasswordInput
                        label="Contraseña"
                        placeholder="Tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        radius="md"
                      />
                      <Anchor
                        size="xs"
                        component="button"
                        onClick={() => {
                          setShowReset(true);
                          clearMessages();
                        }}
                      >
                        ¿Olvidaste tu contraseña?
                      </Anchor>
                      <Button
                        size="md"
                        radius="lg"
                        onClick={loginEmail}
                        loading={isSigningIn}
                        fullWidth
                      >
                        Entrar
                      </Button>
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel value="register">
                    <Stack gap="sm">
                      <TextInput
                        label="Nombre"
                        placeholder="Tu nombre"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        radius="md"
                      />
                      <TextInput
                        label="Email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                        leftSection={<IconMail size={16} />}
                        radius="md"
                      />
                      <PasswordInput
                        label="Contraseña"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        radius="md"
                      />
                      <Button
                        size="md"
                        radius="lg"
                        onClick={registerEmail}
                        loading={isSigningIn}
                        fullWidth
                      >
                        Crear cuenta
                      </Button>
                    </Stack>
                  </Tabs.Panel>
                </Tabs>
              )}

              <Divider label="o continúa con" labelPosition="center" />

              <Button
                variant="default"
                size="md"
                radius="lg"
                leftSection={<IconBrandGoogle size={18} />}
                onClick={loginGoogle}
                loading={isSigningIn}
                disabled={isSigningIn}
                fullWidth
              >
                Google
              </Button>

              <Text size="xs" c="dimmed" ta="center">
                Al continuar, aceptas una experiencia simple y privada para ti y tu pareja.{" "}
                <Anchor size="xs" href="#" onClick={(e) => e.preventDefault()}>
                  Ver detalles
                </Anchor>
              </Text>
            </Stack>
          </Card>
        </Center>
      </Container>
    </Box>
  );
}
