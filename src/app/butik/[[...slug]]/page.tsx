import { ButikApp } from "@/components/butik/ButikApp";

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

export default function ButikCatchAllPage() {
  return <ButikApp />;
}
