import "@mantine/core/styles.css";
import "./globals.css";

import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
  createTheme,
} from "@mantine/core";
import { UserProvider } from "./context/UserProvider";
import { BottomBar } from "./components/BottomBar";

export const metadata = {
  title: "Pair Collection",
  manifest: "/manifest.webmanifest",
};

const theme = createTheme({
  primaryColor: "pink",
  fontFamily: "Inter, system-ui, sans-serif",
  defaultRadius: "md",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" {...mantineHtmlProps}>
      <head>
        {/* Recomendado por Mantine para evitar “flash” de tema */}
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <UserProvider>
            {children}
            <BottomBar />
          </UserProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
