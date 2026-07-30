import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Capture Your Masterpiece Moment",
};

export default function BrightspotTamanLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
