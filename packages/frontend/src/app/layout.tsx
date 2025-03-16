"use client";
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { I18nextProvider } from "react-i18next";
import i18n from "../../i18n";

// export const metadata: Metadata = {
//   title: "Qrent",
//   description: "Your Smart Rental Assistent",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <I18nextProvider i18n={i18n}>
      <html lang="en" className="bg-white" suppressHydrationWarning>
        <body>
          <NavBar />
          {children}
          <Footer />
        </body>
      </html>
    </I18nextProvider>
  );
}
