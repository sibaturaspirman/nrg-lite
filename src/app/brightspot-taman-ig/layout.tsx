import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brightspot Taman IG — Capture Your Masterpiece Moment",
};

export default function BrightspotTamanIgLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
