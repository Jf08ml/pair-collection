# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pair Collection is a PWA for couples to save and organize links together. Built with Next.js 16, Mantine UI, and Firebase (Auth + Firestore).

## Commands

```bash
npm run dev      # Start dev server (uses webpack, PWA disabled in dev)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

### Authentication & Authorization Flow

The app uses a multi-layer auth gate system:
- `UserProvider` (src/context/UserProvider.tsx) - Global context managing Firebase auth state and user document sync
- `AuthGate` - Redirects unauthenticated users to `/login`
- `CoupleGate` - Enforces couple pairing requirement (`requireCouple` / `requireNoCouple` modes)

### Firestore Data Model

```
users/{uid}
  - coupleId: string | null
  - pendingInviteCode: string | null  // for invite flow
  └── public/profile  // public profile subcollection

couples/{coupleId}
  - members: string[]  // array of uids
  └── collections/{collectionId}
      - name, emoji, itemCount, createdBy
  └── items/{itemId}
      - url, title, note, collectionId, status, createdBy

invites/{code}  // 6-digit code as document ID
  - creatorUid, status (open/claimed/expired), coupleId
```

### Key Patterns

- **INBOX is virtual**: Items with `collectionId === "INBOX"` are inbox items. INBOX has no actual Firestore document, so `itemCount` is only tracked on real collections.
- **Real-time sync**: User document changes are listened to via `onSnapshot` in UserProvider for instant couple pairing updates.
- **Invite flow**: Creator generates 6-digit code → stored in `invites/{code}` and `users/{uid}.pendingInviteCode` → joiner claims → both get `coupleId` set.

### Source Structure

- `src/lib/` - Firebase operations (collections.ts, items.ts, invites.ts, couple.ts)
- `src/context/` - React context providers
- `src/components/` - Reusable UI components (gates, theme toggle, etc.)
- `src/app/` - Next.js App Router pages

### Environment Variables

Firebase config via `NEXT_PUBLIC_FIREBASE_*` env vars (see src/lib/firebase.ts).
