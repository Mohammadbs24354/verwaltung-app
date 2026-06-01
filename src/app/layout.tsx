import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Verwaltungs-App",
  description: "Dienstplan- und Mitarbeiterverwaltung",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
