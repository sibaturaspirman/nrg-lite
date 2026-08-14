import { ShorelineApp } from "@/components/shoreline/ShorelineApp";

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

export default function ShorelineCatchAllPage() {
  return <ShorelineApp />;
}
