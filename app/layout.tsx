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
            __html: `(function(){try{var t=localStorage.getItem('pipeshark-theme');var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t==='light'||t==='dark'?t:(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
        <ThemeProvider>
          <ApiPauseProvider>
            <CampaignLoadingProvider>
              <AppBackgroundWrapper>{children}</AppBackgroundWrapper>
              {process.env.NEXT_PUBLIC_VERCEL === '1' ? <Analytics /> : null}
            </CampaignLoadingProvider>
          </ApiPauseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
