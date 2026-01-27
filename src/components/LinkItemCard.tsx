/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/LinkItemCard.tsx
"use client";

import { useMemo } from "react";
import {
  ActionIcon,
  Anchor,
  Box,
  Card,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconExternalLink, IconTrash } from "@tabler/icons-react";

import { getDomain } from "../lib/items";
import { useLinkPreview, type LinkPreview } from "../hooks/useLinkPreview";

type Collection = { id: string; name: string; emoji?: string | null };

function buildMoveOptions(collections: Collection[], includeInbox: boolean) {
  const opts = collections.map((c) => ({
    value: c.id,
    label: `${c.emoji || "✨"} ${c.name}`,
  }));
  return includeInbox ? [{ value: "INBOX", label: "📥 Inbox" }, ...opts] : opts;
}

export function LinkItemCard(props: {
  item: any;
  collections: Collection[];
  moving?: boolean;

  includeInboxInMove?: boolean; // INBOX row => false, collection page => true
  currentCollectionId?: string; // solo para “value” del select si quieres

  onMove: (toCollectionId: string) => void;
  onDelete?: () => void;

  // cache opcional (recomendado para listas)
  previewCache?: Record<string, LinkPreview | null>;
  setPreviewCache?: React.Dispatch<
    React.SetStateAction<Record<string, LinkPreview | null>>
  >;
}) {
  const {
    item,
    collections,
    moving = false,
    includeInboxInMove = false,
    currentCollectionId,
    onMove,
    onDelete,
    previewCache,
    setPreviewCache,
  } = props;

  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const domain = getDomain(item.url);
  const baseTitle = item.title || domain || "Link guardado";
  const note = item.note || "";

  const preview = useLinkPreview(item?.url, previewCache, setPreviewCache);

  const hasPreview =
    !!preview && (preview?.title || preview?.description || preview?.image);

  const previewTitle = (preview as any)?.title || baseTitle;
  const previewDesc = (preview as any)?.description || "";
  const previewSite = (preview as any)?.siteName || domain || "";

  const moveOptions = useMemo(
    () => buildMoveOptions(collections, includeInboxInMove),
    [collections, includeInboxInMove],
  );

  return (
    <Card
      withBorder
      radius="xl"
      p="md"
      style={{
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
        },
      }}
    >
      <Stack gap="sm">
        {/* Top: site + actions */}
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap={8} wrap="wrap">
            {previewSite ? (
              <Text size="xs" c="dimmed">
                {previewSite}
              </Text>
            ) : null}
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Abrir" withArrow>
              <ActionIcon
                variant="default"
                radius="lg"
                size="lg"
                component="a"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir"
              >
                <IconExternalLink size={18} />
              </ActionIcon>
            </Tooltip>

            {onDelete && (
              <Tooltip label="Eliminar" withArrow>
                <ActionIcon
                  variant="default"
                  radius="lg"
                  size="lg"
                  disabled={moving}
                  onClick={onDelete}
                  aria-label="Eliminar"
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* Preview */}
        {hasPreview ? (
          <Card
            withBorder
            radius="lg"
            p="sm"
            style={{
              background:
                "color-mix(in srgb, var(--mantine-color-body) 86%, transparent)",
            }}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              {/* Thumb */}
              {(preview as any)?.image ? (
                <Box
                  style={{
                    width: 96,
                    height: 64,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid var(--mantine-color-default-border)",
                    flex: "0 0 auto",
                    background: "var(--mantine-color-dark-7)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/image-proxy?url=${encodeURIComponent(
                      (preview as any).image,
                    )}`}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                </Box>
              ) : (
                <Box
                  style={{
                    width: 96,
                    height: 64,
                    borderRadius: 14,
                    border: "1px dashed var(--mantine-color-default-border)",
                    flex: "0 0 auto",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <IconExternalLink size={18} />
                </Box>
              )}

              {/* Text */}
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Anchor
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  fw={800}
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <Text lineClamp={2}>{previewTitle}</Text>
                </Anchor>

                {previewDesc ? (
                  <Text size="sm" c="dimmed" mt={4} lineClamp={2}>
                    {previewDesc}
                  </Text>
                ) : null}
              </Box>
            </Group>
          </Card>
        ) : (
          <Anchor
            href={item.url}
            target="_blank"
            rel="noreferrer"
            fw={800}
            style={{ textDecoration: "none" }}
          >
            <Text lineClamp={2}>{baseTitle}</Text>
          </Anchor>
        )}

        {/* Note */}
        {note ? (
          <Text
            size="sm"
            c="dimmed"
            style={{ whiteSpace: "pre-wrap" }}
            lineClamp={3}
          >
            {note}
          </Text>
        ) : null}

        {/* Move */}
        <Group
          gap="sm"
          align="center"
          justify="space-between"
          wrap={isMobile ? "wrap" : "nowrap"}
        >
          <Select
            disabled={moving}
            placeholder="Mover a…"
            data={moveOptions}
            value={currentCollectionId}
            onChange={(v) => v && onMove(v)}
            style={{ flex: 1, minWidth: isMobile ? "100%" : 280 }}
          />

          {moving ? (
            <Group gap="xs" justify="flex-end" style={{ minWidth: 120 }}>
              <Loader size="xs" />
              <Text size="xs" c="dimmed">
                Moviendo…
              </Text>
            </Group>
          ) : (
            <Text
              size="xs"
              c="dimmed"
              style={{ minWidth: 120, textAlign: "right" }}
            >
              &nbsp;
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
