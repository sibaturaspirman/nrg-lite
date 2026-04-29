import Image from "next/image";
import Link from "next/link";
import { Great_Vibes, Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const electricScript = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
});

export function HomeLanding() {
  return (
    <div
      className={`flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black ${montserrat.className}`}
    >
      <div
        className="relative mx-auto h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] [container-type:inline-size]"
        style={{ aspectRatio: "9 / 16" }}
      >
        <Image
          src="/images/bg.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="object-cover"
        />

        <Link
          href="/tnc"
          aria-label="Mulai photobooth"
          className="group absolute inset-0 z-10 flex flex-col items-center justify-center px-[6cqw] text-center text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={400}
            height={120}
            priority
            className="h-auto w-[80vw] object-contain"
          />

          <Image
            src="/images/btn-begin.png"
            alt="Click to begin"
            width={900}
            height={180}
            priority
            className="animate-bounce mt-[9cqw] h-auto w-[60vw] object-contain transition-transform duration-200 group-hover:scale-[1.02] group-active:scale-[0.98]"
          />
        </Link>
      </div>
    </div>
  );
}
