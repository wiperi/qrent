import type { Metadata } from "next";
import "./globals.css";
import Landing from "../components/Landing";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Qrent",
  description: "Your Smart Rental Assistent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white">
      <body>
        <Landing />
        {children}
        <Footer />
      </body>
    </html>
  );
}
