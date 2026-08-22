import { BrightspotTamanIgApp } from "@/components/brightspot-taman-ig/BrightspotTamanIgApp";

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

export default function BrightspotTamanIgCatchAllPage() {
  return <BrightspotTamanIgApp />;
}
