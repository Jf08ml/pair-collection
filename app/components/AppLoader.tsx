"use client";

import { Center, Image, Stack, Text } from "@mantine/core";

type AppLoaderProps = {
  message?: string;
  fullScreen?: boolean;
};

export function AppLoader({
  message = "Cargando…",
  fullScreen = true,
}: AppLoaderProps) {
  const content = (
    <Stack align="center" gap="sm">
      {/* Halo suave */}
      <div
        style={{
          padding: 16,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,105,180,0.25) 0%, rgba(255,105,180,0.15) 35%, rgba(255,105,180,0.05) 55%, transparent 70%)",
          animation: "glow 2.4s ease-in-out infinite",
        }}
      >
        <Image
          src="/logo.png"
          alt="Pair Collection"
          w={72}
          h={72}
          radius="lg"
          style={{
            animation: "pulse 1.6s ease-in-out infinite",
          }}
        />
      </div>

      <Text size="sm" fw={500} c="pink.6">
        {message}
      </Text>

      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.06);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0.85;
          }
        }

        @keyframes glow {
          0% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.55;
          }
        }
      `}</style>
    </Stack>
  );

  if (!fullScreen) return content;

  return (
    <Center
      h="100vh"
      w="100vw"
      style={{
        background:
          "radial-gradient(1200px 600px at 18% 0%, rgba(255,105,180,0.16), transparent 55%), radial-gradient(1200px 600px at 82% 0%, rgba(99,102,241,0.12), transparent 55%), var(--mantine-color-body)",
      }}
    >
      {content}
    </Center>
  );
}
