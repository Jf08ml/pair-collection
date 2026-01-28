/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Collapse,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconMessageCircle,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";

import {
  addComment,
  deleteComment,
  listComments,
  type Comment,
} from "../lib/items";

type Props = {
  coupleId: string;
  itemId: string;
  currentUserId: string;
  initialCount?: number;
};

export function CommentsSection({
  coupleId,
  itemId,
  currentUserId,
  initialCount = 0,
}: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [newText, setNewText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const count = loaded ? comments.length : initialCount;

  async function loadComments() {
    if (loaded) return;
    setLoading(true);
    try {
      const list = await listComments({ coupleId, itemId });
      setComments(list);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !loaded) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSend() {
    const text = newText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const commentId = await addComment({
        coupleId,
        itemId,
        text,
        authorId: currentUserId,
      });

      // Agregar al inicio (más reciente primero)
      setComments((prev) => [
        {
          id: commentId,
          text,
          authorId: currentUserId,
          createdAt: { seconds: Date.now() / 1000 },
        },
        ...prev,
      ]);
      setNewText("");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm("¿Eliminar este comentario?")) return;

    setDeletingId(commentId);
    try {
      await deleteComment({ coupleId, itemId, commentId });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } finally {
      setDeletingId(null);
    }
  }

  function formatTime(timestamp: any) {
    if (!timestamp?.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Menos de 1 minuto
    if (diff < 60 * 1000) return "ahora";
    // Menos de 1 hora
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m`;
    // Menos de 24 horas
    if (diff < 24 * 60 * 60 * 1000)
      return `${Math.floor(diff / (60 * 60 * 1000))}h`;
    // Más de 24 horas
    return date.toLocaleDateString("es", { day: "numeric", month: "short" });
  }

  return (
    <Box>
      {/* Toggle button */}
      <Button
        variant="subtle"
        size="xs"
        radius="xl"
        leftSection={<IconMessageCircle size={14} />}
        rightSection={
          open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
        }
        onClick={() => setOpen(!open)}
        styles={{
          root: {
            paddingLeft: 8,
            paddingRight: 8,
          },
        }}
      >
        {count > 0 ? `${count} comentario${count !== 1 ? "s" : ""}` : "Comentar"}
      </Button>

      <Collapse in={open}>
        <Box
          mt="sm"
          p="sm"
          style={{
            borderRadius: 16,
            border: "1px solid var(--mantine-color-default-border)",
            background:
              "color-mix(in srgb, var(--mantine-color-body) 96%, transparent)",
          }}
        >
          {/* Input para nuevo comentario */}
          <Group gap="sm" align="flex-end" wrap="nowrap">
            <Textarea
              placeholder="Escribe un comentario..."
              value={newText}
              onChange={(e) => setNewText(e.currentTarget.value)}
              autosize
              minRows={1}
              maxRows={4}
              radius="lg"
              style={{ flex: 1 }}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Tooltip label="Enviar" withArrow>
              <ActionIcon
                variant="filled"
                radius="xl"
                size="lg"
                onClick={handleSend}
                loading={sending}
                disabled={!newText.trim()}
              >
                <IconSend size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {/* Lista de comentarios */}
          {loading ? (
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          ) : comments.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No hay comentarios aún
            </Text>
          ) : (
            <Stack gap="sm" mt="sm">
              {comments.map((comment) => (
                <Group
                  key={comment.id}
                  gap="sm"
                  wrap="nowrap"
                  align="flex-start"
                >
                  <Avatar size={28} radius="xl">
                    {comment.authorId === currentUserId ? "Yo" : "❤️"}
                  </Avatar>

                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" align="center">
                      <Text size="xs" fw={600}>
                        {comment.authorId === currentUserId ? "Tú" : "Tu pareja"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatTime(comment.createdAt)}
                      </Text>
                    </Group>
                    <Text
                      size="sm"
                      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {comment.text}
                    </Text>
                  </Box>

                  {/* Solo el autor puede eliminar */}
                  {comment.authorId === currentUserId && (
                    <Tooltip label="Eliminar" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        radius="xl"
                        onClick={() => handleDelete(comment.id)}
                        loading={deletingId === comment.id}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
