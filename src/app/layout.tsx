import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const editorial = localFont({
  src: [
    { path: "../../public/fonts/BBCReithSerif_W_Rg.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/BBCReithSerif_W_Md.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/BBCReithSerif_W_Bd.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/BBCReithSerif_W_It.woff2", weight: "400", style: "italic" },
  ], variable: "--font-editorial", display: "swap",
});
const interfaceFont = localFont({
  src: [
    { path: "../../public/fonts/BBCReithSans_W_Rg.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/BBCReithSans_W_Md.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/BBCReithSans_W_Bd.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/BBCReithSans_W_It.woff2", weight: "400", style: "italic" },
  ], variable: "--font-interface", display: "swap",
});

export const metadata: Metadata = {
  title: "The Personalized Time",
  icons: { icon: "/icon.svg" },
  description: "Technology and biotech news from your selected sources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${interfaceFont.variable} ${editorial.variable}`}><body>{children}</body></html>;
}
