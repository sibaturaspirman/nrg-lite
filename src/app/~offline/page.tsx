import Image from "next/image";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black">
      <div
        className="relative mx-auto h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] [container-type:inline-size]"
        style={{ aspectRatio: "9 / 16" }}
      >
        <Image
          src="/images/bt/bg.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="object-cover"
        />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[4cqw] px-[8cqw] text-center">
          <Image
            src="/images/bt/logo.png"
            alt="Brightspot"
            width={400}
            height={250}
            priority
            className="h-auto w-[55%] object-contain"
          />
          <p className="text-[clamp(0.9rem,4cqw,1.35rem)] font-semibold uppercase tracking-[0.12em] text-white">
            You&apos;re offline
          </p>
          <p className="text-[clamp(0.7rem,3cqw,1rem)] text-white/80">
            Photobooth tetap bisa dipakai. QR download butuh koneksi.
          </p>
          <Link
            href="/brightspot-taman"
            className="mt-[2cqw] text-[clamp(0.7rem,2.8cqw,0.95rem)] font-semibold uppercase tracking-[0.16em] text-white underline underline-offset-4"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
