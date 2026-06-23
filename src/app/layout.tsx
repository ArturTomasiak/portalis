import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "polaris",
  description: "Your tool for maritime logistics analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
