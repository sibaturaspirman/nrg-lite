import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Capture Your Masterpiece Moment",
    short_name: "Masterpiece",
    description: "Brightspot Taman photobooth — capture your masterpiece moment.",
    start_url: "/brightspot-taman",
    scope: "/brightspot-taman",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a0508",
    theme_color: "#8b0000",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
