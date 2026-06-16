import { SITE_URL } from "../lib/site";

export default function sitemap() {
  const now = new Date();
  const pages = [
    { path: "", changeFrequency: "hourly", priority: 1 },
    { path: "/cosa-e", changeFrequency: "monthly", priority: 0.5 },
    { path: "/fonti", changeFrequency: "monthly", priority: 0.5 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cookie", changeFrequency: "yearly", priority: 0.3 },
    { path: "/note-legali", changeFrequency: "yearly", priority: 0.3 },
  ];
  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
