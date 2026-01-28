/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/LinkItemCard.tsx
"use client";

import { useMemo } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Card,
  Checkbox,
  Group,
  Loader,
  Menu,
  Select,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconDots,
  IconExternalLink,
  IconTrash,
  IconFolderSymlink,
} from "@tabler/icons-react";

import { getDomain } from "../lib/items";
import { useLinkPreview, type LinkPreview } from "../hooks/useLinkPreview";
import { CommentsSection } from "./CommentsSection";

type Collection = { id: string; name: string; emoji?: string | null };

function buildMoveOptions(collections: Collection[], includeInbox: boolean) {
  const opts = collections.map((c) => ({
    value: c.id,
    label: `${c.emoji || "✨"} ${c.name}`,
  }));
  return includeInbox ? [{ value: "INBOX", label: "📥 Inbox" }, ...opts] : opts;
}

function faviconUrl(domain: string, size = 64) {
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${encodeURIComponent(
    domain,
  )}`;
}

export function LinkItemCard(props: {
  item: any;
  collections: Collection[];
  moving?: boolean;

  includeInboxInMove?: boolean; // INBOX row => false, collection page => true
  currentCollectionId?: string; // value del select

  onMove: (toCollectionId: string) => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;

  previewCache?: Record<string, LinkPreview | null>;
  setPreviewCache?: React.Dispatch<
    React.SetStateAction<Record<string, LinkPreview | null>>
  >;

  // Para comentarios
  coupleId?: string;
  currentUserId?: string;
}) {
  const {
    item,
    collections,
    moving = false,
    includeInboxInMove = false,
    currentCollectionId,
    onMove,
    onDelete,
    onToggleStatus,
    previewCache,
    setPreviewCache,
    coupleId,
    currentUserId,
  } = props;

  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const domain = getDomain(item.url);
  const note = item.note || "";
  const isDone = item.status === "done";

  const preview = useLinkPreview(item?.url, previewCache, setPreviewCache);

  const hasPreview =
    !!preview && (preview?.title || preview?.description || preview?.image);

  const previewDesc = (preview as any)?.description || "";
  const previewSite = (preview as any)?.siteName || domain || "";

  const moveOptions = useMemo(
    () => buildMoveOptions(collections, includeInboxInMove),
    [collections, includeInboxInMove],
  );

  const thumb = (preview as any)?.image || "";
  const clickable = { href: item.url, target: "_blank", rel: "noreferrer" };

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
        {/* Header: favicon + domain + status + menu */}
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Avatar
              radius="xl"
              size={32}
              src={domain ? faviconUrl(domain, 64) : undefined}
              styles={{
                root: {
                  border: "1px solid var(--mantine-color-default-border)",
                  background:
                    "color-mix(in srgb, var(--mantine-color-body) 90%, transparent)",
                },
              }}
            >
              🔗
            </Avatar>

            <Box style={{ minWidth: 0 }}>
              <Group gap={8} align="center" wrap="wrap">
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {previewSite || domain || "Sitio"}
                </Text>

                <Badge
                  variant="light"
                  color={isDone ? "green" : "gray"}
                  radius="xl"
                  size="sm"
                >
                  {isDone ? "Hecho" : "Pendiente"}
                </Badge>
              </Group>

            </Box>
          </Group>

          <Group gap="xs" wrap="nowrap" align="center">
            {onToggleStatus && (
              <Tooltip
                label={isDone ? "Marcar como pendiente" : "Marcar como hecho"}
                withArrow
              >
                <Checkbox
                  checked={isDone}
                  onChange={onToggleStatus}
                  disabled={moving}
                  radius="xl"
                  size="md"
                  aria-label={isDone ? "Marcar como pendiente" : "Marcar como hecho"}
                />
              </Tooltip>
            )}

            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="default"
                  radius="xl"
                  size="lg"
                  aria-label="Acciones"
                >
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconExternalLink size={16} />}
                  component="a"
                  {...clickable}
                >
                  Abrir
                </Menu.Item>

                {onDelete && (
                  <>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={onDelete}
                      disabled={moving}
                    >
                      Eliminar
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        {/* Preview visual (más social) */}
        {hasPreview ? (
          <Card
            withBorder
            radius="xl"
            p={0}
            component="a"
            {...clickable}
            style={{
              textDecoration: "none",
              overflow: "hidden",
              background:
                "color-mix(in srgb, var(--mantine-color-body) 88%, transparent)",
            }}
          >
            <Group wrap="nowrap" gap={0} style={{ alignItems: "stretch" }}>
              {/* Thumb */}
              <Box
                style={{
                  width: isMobile ? 120 : 160,
                  minHeight: isMobile ? 86 : 96,
                  borderRight: "1px solid var(--mantine-color-default-border)",
                  position: "relative",
                  background:
                    "radial-gradient(240px 120px at 30% 0%, rgba(255,105,180,0.14), transparent 60%), radial-gradient(240px 120px at 70% 0%, rgba(99,102,241,0.10), transparent 60%)",
                }}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/image-proxy?url=${encodeURIComponent(thumb)}`}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : null}

                {/* overlay suave */}
                <Box
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.02))",
                    pointerEvents: "none",
                  }}
                />
              </Box>

              {/* Text */}
              <Box p="md" style={{ minWidth: 0, flex: 1 }}>
                {previewDesc ? (
                  <Text size="sm" c="dimmed" lineClamp={3}>
                    {previewDesc}
                  </Text>
                ) : (
                  <Text size="sm" c="dimmed" lineClamp={3}>
                    Abre el link para ver más.
                  </Text>
                )}

                {!!domain && (
                  <Group mt="sm" gap="xs">
                    <Badge variant="light" radius="xl">
                      {domain}
                    </Badge>
                    <Badge variant="light" radius="xl">
                      Ver
                    </Badge>
                  </Group>
                )}
              </Box>
            </Group>
          </Card>
        ) : null}

        {/* Note (caption) */}
        {note ? (
          <Text
            size="sm"
            c="dimmed"
            style={{ whiteSpace: "pre-wrap" }}
            lineClamp={4}
          >
            {note}
          </Text>
        ) : null}

        {/* Move (acción abajo tipo “share/move”) */}
        <Group
          gap="sm"
          align="center"
          justify="space-between"
          wrap={isMobile ? "wrap" : "nowrap"}
        >
          <Select
            disabled={moving}
            placeholder="Mover a…"
            leftSection={<IconFolderSymlink size={16} />}
            data={moveOptions}
            value={currentCollectionId}
            onChange={(v) => v && onMove(v)}
            radius="xl"
            comboboxProps={{ withinPortal: true }}
            style={{ flex: 1, minWidth: isMobile ? "100%" : 300 }}
          />

          {moving ? (
            <Group gap="xs" justify="flex-end" style={{ minWidth: 120 }}>
              <Loader size="xs" />
              <Text size="xs" c="dimmed">
                Moviendo…
              </Text>
            </Group>
          ) : (
            <Text size="xs" c="dimmed" style={{ minWidth: 120, textAlign: "right" }}>
              &nbsp;
            </Text>
          )}
        </Group>

        {/* Comentarios */}
        {coupleId && currentUserId && (
          <CommentsSection
            coupleId={coupleId}
            itemId={item.id}
            currentUserId={currentUserId}
            initialCount={item.commentCount || 0}
          />
        )}
      </Stack>
    </Card>
  );
}
