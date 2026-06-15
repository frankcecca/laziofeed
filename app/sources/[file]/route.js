import { readFile } from "node:fs/promises";
import path from "node:path";

// Serve le favicon delle fonti dal volume persistente (data/sources): in
// produzione `next start` NON serve i file scritti in public/ a runtime, quindi
// le favicon scaricate dal collect passano da qui.
export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const file = path.basename(params.file || ""); // evita path traversal
  if (!/^[a-z0-9.\-]+\.png$/i.test(file)) {
    return new Response(null, { status: 404 });
  }
  try {
    const buf = await readFile(
      path.join(process.cwd(), "data", "sources", file)
    );
    return new Response(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
