import { BengkelApp } from "@/components/bengkel/BengkelApp";

export function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ["tnc"] },
    { slug: ["ready"] },
    { slug: ["booth"] },
    { slug: ["template"] },
    { slug: ["print"] },
    { slug: ["result"] },
    { slug: ["point"] },
  ];
}

export default function BengkelCatchAllPage() {
  return <BengkelApp />;
}
