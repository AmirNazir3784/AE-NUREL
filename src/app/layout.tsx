import localFont from "next/font/local";
import { pageMetadata } from "@/lib/site-metadata";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { JsonLd } from "@/components/site/json-ld";
import { siteJsonLd } from "@/lib/structured-data";
import { historyInitializationScript } from "@/lib/history-navigation";
import { accountPreviewAvailable } from "@/lib/account-preview";
import { membershipEnabled } from "@/lib/membership-config";
import "./globals.css";
import "./aenural.css";
import "./aenural-tools.css";

const sora = localFont({ src: "./fonts/Sora-Variable.woff2", weight: "100 800", display: "swap", variable: "--font-sora" });
const inter = localFont({ src: "./fonts/Inter-Variable.woff2", weight: "100 900", display: "swap", variable: "--font-inter" });

export const metadata = {
  ...pageMetadata("Tools for People Who Edit", "AENural Source Window and free browser-based tools for editors.", "/"),
  title: { default: "AENural — Tools for People Who Edit", template: "%s | AENural" },
  applicationName: "AENural", icons: {
    icon: [{ url: "/favicon.ico", sizes: "32x32 48x48 96x96", type: "image/x-icon" }, { url: "/branding/aenural-icon-96.png", sizes: "96x96", type: "image/png" }],
    apple: [{ url: "/branding/aenural-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script id="aenural-history-init" dangerouslySetInnerHTML={{ __html: historyInitializationScript }} />
      </head>
      <body className="min-h-full flex flex-col"><a href="#main-content" className="skip-link">Skip to content</a><JsonLd data={siteJsonLd()} /><Header membershipPreview={accountPreviewAvailable()} accountsEnabled={membershipEnabled()} />{children}<Footer /></body>
    </html>
  );
}
