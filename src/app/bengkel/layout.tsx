import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bengkel — Capture Your Masterpiece Moment",
};

export default function BengkelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
