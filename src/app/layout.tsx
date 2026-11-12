import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const masthead = localFont({ src: "../../public/fonts/chomsky.woff2", variable: "--font-masthead", display: "swap" });
const editorial = localFont({
  src: [
    { path: "../../public/fonts/libre-caslon-regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/libre-caslon-bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/libre-caslon-italic.ttf", weight: "400", style: "italic" },
  ], variable: "--font-editorial", display: "swap",
});

export const metadata: Metadata = {
  title: "The Modern Times",
  icons: { icon: "/icon.svg" },
  description: "Technology and biotech news from your selected sources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${masthead.variable} ${editorial.variable}`}><body>{children}</body></html>;
}
