import type { Metadata } from "next";
import "./globals.css";
import NavBar from "../components/NavBar";
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
    <html lang="en" className="bg-white" suppressHydrationWarning>
      <body>
        <NavBar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
