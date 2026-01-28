// src/components/NotificationPermissionBanner.tsx
"use client";

import { useState } from "react";
import { Alert, Button, Group, Text, Stack } from "@mantine/core";
import { IconBell, IconBellOff } from "@tabler/icons-react";
import { usePushNotifications } from "../hooks/usePushNotifications";

export function NotificationPermissionBanner() {
  const { isSupported, permissionStatus, isLoading, requestPermission } =
    usePushNotifications();

  const [dismissed, setDismissed] = useState(false);

  // No mostrar si no es soportado, ya tiene permisos, fue denegado, o fue descartado
  if (
    !isSupported ||
    permissionStatus !== "default" ||
    dismissed
  ) {
    return null;
  }

  return (
    <Alert
      radius="lg"
      color="pink"
      icon={<IconBell size={20} />}
      withCloseButton
      closeButtonLabel="Descartar"
      onClose={() => setDismissed(true)}
      styles={{
        root: {
          border: "1px solid var(--mantine-color-pink-light)",
          background:
            "color-mix(in srgb, var(--mantine-color-pink-light) 10%, transparent)",
        },
      }}
    >
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          Activa las notificaciones
        </Text>
        <Text size="xs" c="dimmed">
          Recibe alertas cuando tu pareja agregue links o comente.
        </Text>
        <Group gap="xs" mt="xs">
          <Button
            size="xs"
            radius="xl"
            loading={isLoading}
            onClick={requestPermission}
            leftSection={<IconBell size={14} />}
          >
            Activar
          </Button>
          <Button
            size="xs"
            radius="xl"
            variant="subtle"
            onClick={() => setDismissed(true)}
            leftSection={<IconBellOff size={14} />}
          >
            Ahora no
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
}
