import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ApiPauseProvider } from "@/contexts/ApiPauseContext";
import { CampaignLoadingProvider } from "@/contexts/CampaignLoadingContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppBackgroundWrapper from "@/components/AppBackgroundWrapper";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PipeShark - Dashboard",
  description: "Outil de prospection automatisée pour plombiers",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('pipeshark-theme');var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t==='light'||t==='dark'?t:(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));})();`,
          }}
        />
        <ThemeProvider>
          <ApiPauseProvider>
            <CampaignLoadingProvider>
              <AppBackgroundWrapper>{children}</AppBackgroundWrapper>
              <Analytics />
            </CampaignLoadingProvider>
          </ApiPauseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
