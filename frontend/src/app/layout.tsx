import type { Metadata } from "next";
import "./globals.css";
import { geistSans, geistMono } from "./fonts";
import Navbar from "@/components/Navbar";
export const metadata: Metadata = {
  title: "Qrent - Smooth Renting Experience",
  description: "Qrent is a platform that allows you to rent and connect with others easily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
