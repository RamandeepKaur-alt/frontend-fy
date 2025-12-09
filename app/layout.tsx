import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import ClipboardProviderWrapper from "./components/ClipboardProviderWrapper";
import PageTransitionProvider from "./components/PageTransitionProvider";
import FontAwesomeLoader from "./components/FontAwesomeLoader";
import FontLoader from "./components/FontLoader";
import { BRAND_NAME } from "./config/brand";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} - Your Personal Cloud Workspace`,
  description: "Create, organize, lock and manage your folders with ease. Your personal cloud workspace — organized, secure, beautifully simple.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <body
        className={`${poppins.variable} font-sans antialiased`}
        style={{ 
          backgroundColor: '#FAFAFA',
          minHeight: '100vh',
          margin: 0,
          padding: 0,
        }}
      >
        <FontLoader />
        <FontAwesomeLoader />
        <ClipboardProviderWrapper>
          <Suspense fallback={null}>
            <PageTransitionProvider>
              {children}
            </PageTransitionProvider>
          </Suspense>
        </ClipboardProviderWrapper>
      </body>
    </html>
  );
}
