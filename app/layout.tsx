import "./globals.css";
import { UserProvider } from "./context/UserProvider";

export const metadata = {
  title: "Pair Collection",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
