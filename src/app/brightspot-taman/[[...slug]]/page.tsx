import { BrightspotTamanApp } from "@/components/brightspot-taman/BrightspotTamanApp";

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

export default function BrightspotTamanCatchAllPage() {
  return <BrightspotTamanApp />;
}
