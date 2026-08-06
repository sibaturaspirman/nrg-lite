import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Butik — Capture Your Masterpiece Moment",
};

export default function ButikLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
