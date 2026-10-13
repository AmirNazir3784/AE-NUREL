import localFont from "next/font/local";
import { pageMetadata } from "@/lib/site-metadata";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { historyInitializationScript } from "@/lib/history-navigation";
import "./globals.css";
import "./aenural.css";
import "./aenural-tools.css";

const sora = localFont({ src: "./fonts/Sora-Variable.ttf", weight: "100 800", display: "swap", variable: "--font-sora" });
const inter = localFont({ src: "./fonts/Inter-Variable.ttf", weight: "100 900", display: "swap", variable: "--font-inter" });

export const metadata = {
  ...pageMetadata("Tools for People Who Edit", "AENural Source Window and free browser-based tools for editors.", "/"),
  title: { default: "AENural — Tools for People Who Edit", template: "%s | AENural" },
  applicationName: "AENural", icons: { icon: "/brand.svg", apple: "/apple-icon.png" },
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
      <body className="min-h-full flex flex-col"><a href="#main-content" className="skip-link">Skip to content</a><Header />{children}<Footer /></body>
    </html>
  );
}
