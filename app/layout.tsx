import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ApiPauseProvider } from "@/contexts/ApiPauseContext";
import { CampaignLoadingProvider } from "@/contexts/CampaignLoadingContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PipeShark - Dashboard",
  description: "Outil de prospection automatisée pour plombiers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('pipeshark-theme');var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t==='light'||t==='dark'?t:(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));})();`,
          }}
        />
        <ThemeProvider>
          <ApiPauseProvider>
            <CampaignLoadingProvider>
              {children}
            </CampaignLoadingProvider>
          </ApiPauseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
