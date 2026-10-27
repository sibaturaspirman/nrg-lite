/**
 * Open the system print dialog for a data-URL image.
 * Uses about:blank + document.write (not blob:) so Service Worker / offline
 * mode cannot intercept or break the iframe document.
 */
export function printImage(dataUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    // Off-screen but non-zero size — 0×0 / visibility:hidden can suppress print UI
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "148mm";
    iframe.style.height = "210mm";
    iframe.style.border = "0";

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try {
        iframe.remove();
      } catch {
        // ignore
      }
      resolve();
    };

    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      cleanup();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print A5</title>
    <style>
      @page { size: A5 portrait; margin: 0; }
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
      img { display: block; width: 100%; height: 100%; object-fit: contain; }
    </style>
  </head>
  <body>
    <img id="print-img" alt="" />
  </body>
</html>`);
    doc.close();

    const img = doc.getElementById("print-img") as HTMLImageElement | null;
    if (!img) {
      cleanup();
      return;
    }

    const onAfterPrint = () => {
      win.removeEventListener("afterprint", onAfterPrint);
      setTimeout(cleanup, 200);
    };
    win.addEventListener("afterprint", onAfterPrint);
    // Safety if afterprint never fires (some WebViews / kiosk browsers)
    setTimeout(cleanup, 120_000);

    const triggerPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      requestAnimationFrame(() => requestAnimationFrame(triggerPrint));
    } else {
      img.onload = () => {
        requestAnimationFrame(() => requestAnimationFrame(triggerPrint));
      };
      img.onerror = () => cleanup();
    }
    img.src = dataUrl;
  });
}
