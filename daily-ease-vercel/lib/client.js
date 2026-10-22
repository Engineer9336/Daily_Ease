"use client";
export async function api(path, method = "GET", body) {
  const res = await fetch("/api/" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : method === "GET" ? undefined : { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : method === "GET" ? undefined : "{}",
    credentials: "same-origin",
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) { const e = new Error(data.error || "err_server"); e.key = data.error || "err_server"; throw e; }
  return data;
}

export function avatarUri(name, color = "#0F766E") {
  const ini = (name || "?").trim().split(/\s+/).slice(0, 2).map((p) => Array.from(p)[0]).join("").toUpperCase() || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${color}"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" font-weight="700" fill="#fff">${ini.replace(/[<>&]/g, "")}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/** Resize any image file to a 256x256 JPEG data URL in the browser. */
export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpe?g|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) return reject(new Error("err_photo"));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const s = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("err_photo")); };
    img.src = url;
  });
}
