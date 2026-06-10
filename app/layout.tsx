import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curiosity Lab",
  description: "Každý deň jeden zabudnutý fakt z histórie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a' }}>
        {children}
      </body>
    </html>
  );
}