import type { Metadata } from "next";
import Script from "next/script";

const GA_ID = "G-992VQB0C7R";

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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}