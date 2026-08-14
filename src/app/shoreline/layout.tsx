import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shoreline — Capture Your Masterpiece Moment",
};

export default function ShorelineLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
