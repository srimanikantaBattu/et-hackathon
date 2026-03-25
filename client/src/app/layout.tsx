import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PE Firm | Month-End Close",
  description: "Autonomous Agentic AI Month-End Close Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#18181A] text-foreground flex h-screen overflow-hidden antialiased`}>
        <Providers>
          <Sidebar />

          {/* Main Content */}
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#18181A]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

