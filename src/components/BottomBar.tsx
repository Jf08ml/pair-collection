"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActionIcon,
  Affix,
  Box,
  Center,
  Divider,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  Tooltip,
  rem,
} from "@mantine/core";
import {
  IconBoxMultiple,
  IconHeart,
  IconHome,
  IconLogout,
  IconUser,
} from "@tabler/icons-react";
import { useUser } from "../context/UserProvider";

function NavItem({
  label,
  href,
  icon,
  active,
  disabled,
}: {
  label: string;
  href?: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const content = (
    <Stack gap={2} align="center">
      <ActionIcon
        component={href && !disabled ? "a" : "button"}
        href={href && !disabled ? href : undefined}
        variant={active ? "filled" : "subtle"}
        radius="xl"
        size="lg"
        disabled={disabled}
        aria-label={label}
      >
        {icon}
      </ActionIcon>
      <Text
        size="xs"
        c={disabled ? "dimmed" : undefined}
        fw={active ? 700 : 500}
      >
        {label}
      </Text>
    </Stack>
  );

  return (
    <Tooltip label={label} withArrow position="top">
      <Box>{content}</Box>
    </Tooltip>
  );
}

export function BottomBar() {
  const pathname = usePathname();
  const { fbUser, userDoc, loading, logout } = useUser();

  // Ocultar en login (y puedes añadir más rutas si quieres)
  if (pathname === "/login") return null;

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Espaciador para que el contenido no quede tapado por la barra */}
      <Box h={rem(80)} />

      <Affix position={{ bottom: 0, left: 0, right: 0 }}>
        <Paper
          withBorder
          radius={0}
          px="md"
          py="sm"
          style={{
            borderLeft: 0,
            borderRight: 0,
            borderBottom: 0,
            paddingBottom:
              "calc(var(--mantine-spacing-sm) + env(safe-area-inset-bottom))",
            backdropFilter: "blur(10px)",
          }}
        >
          <Group justify="space-between" align="center">
            <NavItem
              label="Inbox"
              href="/"
              icon={<IconHome size={18} />}
              active={isActive("/")}
            />

            <NavItem
              label="Colecciones"
              href="/collections"
              icon={<IconBoxMultiple size={18} />}
              active={isActive("/collections")}
            />

            <NavItem
              label="Pareja"
              href="/couple"
              icon={<IconHeart size={18} />}
              active={isActive("/couple")}
              disabled={loading || !fbUser || !userDoc?.coupleId}
            />

            <Menu width={220} position="top-end" shadow="md">
              <Menu.Target>
                <Center>
                  <Stack gap={2} align="center">
                    <ActionIcon
                      variant={isActive("/account") ? "filled" : "subtle"}
                      radius="xl"
                      size="lg"
                      disabled={loading}
                      aria-label="Cuenta"
                    >
                      <IconUser size={18} />
                    </ActionIcon>
                    <Text size="xs" fw={isActive("/account") ? 700 : 500}>
                      Cuenta
                    </Text>
                  </Stack>
                </Center>
              </Menu.Target>

              <Menu.Dropdown>
                {!fbUser ? (
                  <Menu.Item
                    component={Link}
                    href="/login"
                    leftSection={<IconUser size={16} />}
                  >
                    Iniciar sesión
                  </Menu.Item>
                ) : (
                  <>
                    <Menu.Item
                      component={Link}
                      href="/account"
                      leftSection={<IconUser size={16} />}
                    >
                      Mi perfil
                    </Menu.Item>

                    <Menu.Item
                      component={Link}
                      href="/couple"
                      leftSection={<IconHeart size={16} />}
                      disabled={!userDoc?.coupleId}
                    >
                      Mi pareja
                    </Menu.Item>

                    <Divider my="xs" />

                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={16} />}
                      onClick={logout}
                    >
                      Cerrar sesión
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Paper>
      </Affix>
    </>
  );
}
