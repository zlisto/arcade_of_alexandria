"""Build games/organic_chemistry/bible.html from game_concept.json + book_contents/contents.json.

The data is embedded in the page, so it opens straight from disk (no server). Images load from assets/
and book_contents/figures/ next to the page. Rerun after editing the concept or regenerating art.

Usage: agents/.venv/Scripts/python.exe -I games/organic_chemistry/scripts/build_bible.py
"""
import json
from pathlib import Path

GAME = Path(__file__).resolve().parents[1]
PREFIX = "games/organic_chemistry/"


def rel(p):
    return p[len(PREFIX):] if p and p.startswith(PREFIX) else p


def main():
    concept = json.loads((GAME / "game_concept.json").read_text(encoding="utf-8"))
    book = json.loads((GAME / "book_contents" / "contents.json").read_text(encoding="utf-8"))

    # image paths relative to the page; mark which files exist
    def fix(obj):
        if isinstance(obj, dict):
            for k, v in list(obj.items()):
                if k == "image_path" and isinstance(v, str):
                    obj[k] = rel(v)
                    obj["image_exists"] = (GAME / obj[k]).exists()
                else:
                    fix(v)
        elif isinstance(obj, list):
            for x in obj:
                fix(x)
    fix(concept)

    # slim book: chapter/section notes + a few captioned figures per chapter
    chapters = []
    sections = {}
    for c in book["chapters"]:
        figs = []
        for s in c["sections"]:
            sections[s["id"]] = {"title": s["title"], "pages": s.get("pages"), "summary": s.get("summary"),
                                 "learner_can_do": s.get("learner_can_do")}
            for f in s["figures"]:
                if f["kind"] in ("figure", "mechanism") and not f.get("is_photo") and len(figs) < 8:
                    figs.append({"file": "book_contents/" + f["file"], "label": f.get("label"),
                                 "caption": (f.get("caption") or "")[:220],
                                 "desc": (f.get("vision") or {}).get("description"), "section": s["id"]})
        n_figs = sum(len(s["figures"]) for s in c["sections"]) + len(c["figures"])
        chapters.append({"id": c["id"], "title": c["title"], "pages": c.get("pages"), "summary": c.get("summary"),
                         "learner_can_do": c.get("learner_can_do"), "game_hook": c.get("game_hook"),
                         "figure_count": n_figs, "figures": figs})
    data = {"concept": concept, "book": {"source": book["source"], "chapters": chapters, "sections": sections}}
    html = TEMPLATE.replace("/*DATA*/null", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
    out = GAME / "bible.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out} ({len(html)//1024} KB)")


TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Legend of Valence Bible</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
:root{
  --ink:#ece7dc; --ink-soft:#c2bcae; --muted:#8a8476; --line:#2e2a33; --paper:#0f0d14; --panel:#17141d; --wash:#201b29;
  --cyan:#43d6e8; --violet:#a06bff; --crimson:#c0394b; --gold:#e8c46a; --radius:12px;
  --shadow:0 1px 0 rgba(0,0,0,.4),0 18px 44px rgba(0,0,0,.4);
  --display:"Cinzel",Georgia,serif; --body:"IBM Plex Sans",system-ui,sans-serif; color-scheme:dark;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;color:var(--ink);font-family:var(--body);line-height:1.55;
  background:radial-gradient(1000px 500px at 5% -10%,rgba(67,214,232,.12),transparent 55%),
             radial-gradient(900px 480px at 100% 0%,rgba(160,107,255,.12),transparent 50%),var(--paper)}
.shell{max-width:1080px;margin:0 auto;padding:1.5rem 16px 4rem}
.cover{border-radius:16px;overflow:hidden;border:1px solid var(--line);box-shadow:var(--shadow);background:#08070b}
.cover img{display:block;width:100%;height:auto;max-height:560px;object-fit:cover}
.eyebrow{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);font-weight:600;margin:1.2rem 0 .3rem}
h1{font-family:var(--display);font-size:clamp(1.9rem,5vw,3rem);margin:0 0 .3rem;letter-spacing:.02em}
.tagline{color:var(--gold);margin:0 0 .6rem;font-size:1.05rem}
.stats{display:flex;flex-wrap:wrap;gap:.4rem;margin:.6rem 0 1rem}
.stats span{font-size:.8rem;border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:.2rem .65rem;color:var(--ink-soft)}
nav.tabs{position:sticky;top:0;z-index:5;display:flex;gap:.3rem;overflow-x:auto;padding:.6rem 0;background:linear-gradient(var(--paper) 75%,transparent);margin-bottom:.6rem}
nav.tabs button{flex:0 0 auto;font:inherit;font-size:.88rem;color:var(--ink-soft);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:.38rem .9rem;cursor:pointer}
nav.tabs button.on{color:#0b0a10;background:var(--cyan);border-color:var(--cyan);font-weight:600}
section.tab{display:none} section.tab.on{display:block}
h2{font-family:var(--display);font-size:1.5rem;margin:.6rem 0 .8rem}
h3{font-family:var(--display);font-size:1.1rem;margin:0 0 .35rem}
.prose p{margin:.4rem 0 .8rem;color:var(--ink-soft)} .prose strong{color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);display:flex;flex-direction:column}
.card .img{background:#0b0a10;aspect-ratio:3/4;display:flex;align-items:center;justify-content:center}
.card .img.sq{aspect-ratio:1/1} .card .img.wide{aspect-ratio:16/9}
.card .img img{width:100%;height:100%;object-fit:cover;display:block}
.card .img .ph{color:var(--muted);font-size:.8rem;padding:1rem;text-align:center}
.card .body{padding:.8rem .9rem 1rem;font-size:.9rem}
.tag{display:inline-block;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--violet);margin-bottom:.25rem;font-weight:600}
.card p{margin:.3rem 0;color:var(--ink-soft)}
.secs{font-size:.78rem;color:var(--muted);margin-top:.5rem}
.secs b{color:var(--cyan);font-weight:500}
.world{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);margin:0 0 16px;overflow:hidden;box-shadow:var(--shadow)}
.world > summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:center;padding:12px}
.world > summary::-webkit-details-marker{display:none}
.world > summary img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;display:block;background:#0b0a10}
.world .num{font-family:var(--display);color:var(--gold);font-size:.85rem}
.world .inner{padding:0 16px 16px}
.world .key{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:.6rem 0}
.box{background:var(--wash);border:1px solid var(--line);border-radius:10px;padding:.7rem .8rem;font-size:.88rem}
.box .lbl{font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.2rem}
.claim{border-left:3px solid var(--crimson);background:rgba(192,57,75,.08)}
.chamber{border-top:1px solid var(--line);padding:.6rem 0;font-size:.9rem}
.chamber .t{font-weight:600} .chamber .p{color:var(--ink-soft);margin:.2rem 0}
.sec{font-size:.8rem;color:var(--muted)} .sec b{color:var(--cyan);font-weight:500}
.figs{display:flex;gap:10px;overflow-x:auto;padding:.4rem 0}
.fig{flex:0 0 220px;background:#fff;border-radius:8px;overflow:hidden;color:#222;font-size:.75rem}
.fig img{width:100%;height:130px;object-fit:contain;background:#fff;display:block}
.fig div{padding:.4rem .5rem;background:#f3f1ea}
.bigart{width:100%;border-radius:10px;display:block;margin:.4rem 0 .8rem;aspect-ratio:16/9;object-fit:cover;background:#0b0a10}
svg.map{width:100%;height:auto;background:#141019;border:1px solid var(--line);border-radius:var(--radius)}
.map text{font-family:var(--body);font-size:15px;fill:var(--ink)}
.chap{background:var(--panel);border:1px solid var(--line);border-radius:10px;margin:0 0 10px;padding:.2rem .9rem}
.chap summary{cursor:pointer;padding:.6rem 0;font-weight:600}
.small{font-size:.8rem;color:var(--muted)}
footer{margin-top:3rem;color:var(--muted);font-size:.8rem;border-top:1px solid var(--line);padding-top:1rem}
@media (max-width:640px){ .world > summary{grid-template-columns:1fr} }
</style>
</head>
<body>
<div class="shell">
  <div class="cover" id="cover"></div>
  <p class="eyebrow">Game bible · Arcade of Alexandria</p>
  <h1 id="title"></h1>
  <p class="tagline" id="tagline"></p>
  <div class="stats" id="stats"></div>
  <nav class="tabs" id="tabs"></nav>
  <section class="tab" id="tab-story"></section>
  <section class="tab" id="tab-map"></section>
  <section class="tab" id="tab-characters"></section>
  <section class="tab" id="tab-bestiary"></section>
  <section class="tab" id="tab-items"></section>
  <section class="tab" id="tab-dungeons"></section>
  <section class="tab" id="tab-locations"></section>
  <section class="tab" id="tab-book"></section>
  <footer id="foot"></footer>
</div>
<script>
const DATA = /*DATA*/null;
const C = DATA.concept, B = DATA.book;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const byId = (list, id) => (list || []).find((x) => x.id === id);
const img = (item, cls = "") => item && item.image_path && item.image_exists
  ? `<img src="${esc(item.image_path)}" alt="${esc(item.name || item.title || "")}" loading="lazy" class="${cls}" />`
  : `<div class="ph">image pending</div>`;
const secs = (ids) => (ids || []).length ? `<div class="secs">Book: ${ids.map((i) => {
  const s = B.sections[i]; return `<b title="${esc(s ? s.title : "")}">§${esc(i)}</b>${s && s.pages ? ` p.${s.pages[0]}` : ""}`; }).join(" · ")}</div>` : "";

function header() {
  document.getElementById("cover").innerHTML = C.cover.image_exists ? `<img src="${esc(C.cover.image_path)}" alt="${esc(C.cover.alt)}" />` : "";
  document.getElementById("title").textContent = C.story.title;
  document.getElementById("tagline").textContent = C.story.tagline;
  const st = [`${C.worlds.length} dungeons`, `${C.characters.length} characters`, `${C.bestiary.length} creatures`,
    `${C.assets.length} items`, `${C.locations.length + C.worlds.length} locations`,
    `Source: ${C.source.book_title} — ${C.source.book_author}`];
  document.getElementById("stats").innerHTML = st.map((s) => `<span>${esc(s)}</span>`).join("");
  document.getElementById("foot").innerHTML = `Built from <code>game_concept.json</code> and <code>book_contents/contents.json</code>.
    Source: ${esc(C.source.book_title)}, ${esc(C.source.book_author)}, ${esc(C.source.publisher)} (${esc(C.source.license)}).
    Section tags (§) link every element to the chapter and page it teaches.`;
}

function story() {
  const s = C.story;
  const arcs = s.characters.map((a) => `<div class="box"><div class="lbl">${esc(byId(C.characters, a.id)?.name || a.id)}</div>${esc(a.arc)}</div>`).join("");
  const wa = s.world_arcs.map((w) => `<div class="chamber"><span class="t">${esc(w.title)}</span><div class="p">${esc(w.beat)}</div></div>`).join("");
  document.getElementById("tab-story").innerHTML = `<h2>Story</h2><div class="prose">
    <p><strong>${esc(s.logline)}</strong></p><p>${esc(s.premise)}</p><p>${esc(s.setting)}</p>
    <p><strong>Tone.</strong> ${esc(s.tone)}</p><p><strong>Teaching spine.</strong> ${esc(s.teaching_spine)}</p></div>
    <h3>Character arcs</h3><div class="key">${arcs}</div>
    <h3 style="margin-top:1rem">The journey</h3>${wa}
    <div class="box" style="margin-top:1rem"><div class="lbl">Finale — ${esc(C.finale.title)}</div>${esc(C.finale.summary)}<p>${esc(C.finale.final_battle)}</p></div>
    <div class="prose" style="margin-top:1rem"><p><strong>Ending.</strong> ${esc(s.ending)}</p>
    <p><strong>Themes.</strong> ${s.themes.map(esc).join(" · ")}</p></div>`;
}

function map() {
  const m = C.map, pos = Object.fromEntries(m.sites.map((s) => [s.id, s]));
  const lines = m.paths.map(([a, b]) => `<line x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}" stroke="#5b4f6e" stroke-width="3" stroke-dasharray="7 6"/>`).join("");
  const dots = m.sites.map((s) => {
    const col = s.kind === "hub" ? "var(--gold)" : s.kind === "finale" ? "var(--crimson)" : s.kind === "town" ? "#ddd" : "var(--cyan)";
    const r = s.kind === "hub" ? 16 : 11;
    return `<g><circle cx="${s.x}" cy="${s.y}" r="${r}" fill="${col}" stroke="#0b0a10" stroke-width="3"/>
      <text x="${s.x}" y="${s.y + r + 18}" text-anchor="middle">${esc(s.label)}</text></g>`; }).join("");
  const ow = byId(C.locations, "overworld");
  document.getElementById("tab-map").innerHTML = `<h2>The Kingdom of Valence</h2>
    <div class="prose"><p>${esc(ow.description)}</p></div>
    ${ow.image_exists ? `<img class="bigart" src="${esc(ow.image_path)}" alt="Overworld concept art" loading="lazy" />` : ""}
    <svg class="map" viewBox="0 0 ${m.size[0]} ${m.size[1]}" role="img" aria-label="Overworld map">${lines}${dots}</svg>
    <p class="small">Schematic layout: gold is the hub, cyan the dungeons, red the finale. Paths show the intended unlock order.</p>`;
}

function cards(list, kind, extra) {
  return `<div class="grid">${list.map((x) => `<article class="card"><div class="img ${kind}">${img(x)}</div><div class="body">
    ${extra(x)}${secs(x.book_section_ids)}</div></article>`).join("")}</div>`;
}

function characters() {
  document.getElementById("tab-characters").innerHTML = `<h2>Characters</h2>` + cards(C.characters, "", (c) =>
    `<span class="tag">${esc(c.role)}${c.dungeon ? " · " + esc(byId(C.worlds, c.dungeon)?.title || "") : ""}</span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p>`);
}
function bestiary() {
  document.getElementById("tab-bestiary").innerHTML = `<h2>Bestiary</h2><div class="prose"><p>Malradix's creatures. Each one obeys a real rule of chemistry and is beaten by understanding it.</p></div>` +
    cards(C.bestiary, "", (b) => `<span class="tag">${esc(b.chemistry)}</span><h3>${esc(b.name)}</h3><p>${esc(b.mechanic)}</p><p class="small">Found: ${esc(b.region)}</p>`);
}
function items() {
  document.getElementById("tab-items").innerHTML = `<h2>Items</h2><div class="prose"><p>Each dungeon's item turns its chapter's key idea into a tool Kai keeps using across the open world.</p></div>` +
    cards(C.assets, "sq", (a) => `<span class="tag">${esc(a.kind)}${a.from ? " · " + esc(byId(C.worlds, a.from)?.title || "") : ""}</span><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p>`);
}
function locations() {
  document.getElementById("tab-locations").innerHTML = `<h2>Locations</h2>` +
    cards(C.locations, "wide", (l) => `<span class="tag">${esc(l.kind)}</span><h3>${esc(l.name)}</h3><p>${esc(l.description)}</p>`);
}

function dungeons() {
  const html = C.worlds.map((w, i) => {
    const sage = byId(C.characters, w.sage), item = byId(C.assets, w.item);
    const ch = B.chapters.find((c) => c.id === w.chapter_id) || {};
    const chambers = w.chambers.map((c) => `<div class="chamber"><span class="t">${esc(c.id)} · ${esc(c.title)}</span>
      <div class="p">${esc(c.puzzle)}</div><div class="sec">${c.section_ids.map((sid) => {
        const s = B.sections[sid]; return `<b>§${esc(sid)}</b> ${esc(s ? s.title : "")}${s && s.pages ? ` (p.${s.pages[0]})` : ""}`; }).join(" · ")}</div></div>`).join("");
    const figs = (ch.figures || []).map((f) => `<div class="fig"><img src="${esc(f.file)}" alt="${esc(f.label || "")}" loading="lazy" />
      <div><b>${esc(f.label || "")}</b> ${esc(f.desc || f.caption)}</div></div>`).join("");
    return `<details class="world" ${i === 0 ? "open" : ""}><summary>
        ${w.art.image_exists ? `<img src="${esc(w.art.image_path)}" alt="" loading="lazy" />` : `<div class="box">image pending</div>`}
        <div><div class="num">Dungeon ${w.number} · Chapter ${esc(w.chapter_id)} · ${esc(w.book_pages)}</div><h3>${esc(w.title)}</h3>
        <div class="small">${esc(w.chapter_title)} — ${esc(w.region)}</div></div></summary>
      <div class="inner"><div class="prose"><p>${esc(w.theme)}</p></div>
        <div class="key">
          <div class="box"><div class="lbl">Sage</div><b>${esc(sage?.name)}</b><br />${esc(sage?.description)}</div>
          <div class="box"><div class="lbl">Item earned</div><b>${esc(item?.name)}</b><br />${esc(item?.description)}</div>
          <div class="box claim"><div class="lbl">Malradix's lie</div>“${esc(w.malradix_claim.claim)}”<br /><span class="small">Refuted by: ${esc(w.malradix_claim.refuted_by)}</span></div>
        </div>
        <h3 style="margin-top:.8rem">Chambers</h3>${chambers}
        <div class="box" style="margin-top:.8rem"><div class="lbl">Boss</div><b>${esc(w.boss.name)}</b><br />${esc(w.boss.fight)}${secs(w.boss.section_ids)}</div>
        <h3 style="margin-top:1rem">What the chapter teaches</h3><div class="prose"><p>${esc(ch.summary)}</p><p><strong>Learner can:</strong> ${esc(ch.learner_can_do)}</p></div>
        ${figs ? `<h3>Figures from the book</h3><div class="figs">${figs}</div><p class="small">${ch.figure_count} figures extracted from this chapter in book_contents/.</p>` : ""}
      </div></details>`; }).join("");
  document.getElementById("tab-dungeons").innerHTML = `<h2>The Twelve Dungeons</h2><div class="prose"><p>One dungeon per chapter. Click a dungeon to open it.</p></div>` + html;
}

function book() {
  const s = B.source;
  const chs = B.chapters.map((c) => `<details class="chap"><summary>Chapter ${esc(c.id)} · ${esc(c.title)} <span class="small">pp. ${c.pages ? c.pages.join("–") : ""} · ${c.figure_count} figures</span></summary>
    <div class="prose"><p>${esc(c.summary)}</p><p><strong>Game hook:</strong> ${esc(c.game_hook)}</p></div></details>`).join("");
  document.getElementById("tab-book").innerHTML = `<h2>Source book</h2><div class="prose"><p><strong>${esc(s.title)}: ${esc(s.subtitle || "")}</strong> by ${esc(s.author)},
    ${esc(s.publisher)}, ${esc(s.year || "")}. ${esc(s.edition || "")}. License: ${esc(s.license)}.</p><p class="small">${esc(s.license_note || "")}</p></div>${chs}`;
}

const TABS = [["story", "Story"], ["map", "Map"], ["characters", "Characters"], ["bestiary", "Bestiary"], ["items", "Items"],
  ["dungeons", "Dungeons"], ["locations", "Locations"], ["book", "Book"]];
function activate(id) {
  document.querySelectorAll("section.tab").forEach((s) => s.classList.toggle("on", s.id === "tab-" + id));
  document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.toggle("on", b.dataset.id === id));
  try { localStorage.setItem("valence-bible-tab", id); } catch (e) {}
}
header(); story(); map(); characters(); bestiary(); items(); dungeons(); locations(); book();
document.getElementById("tabs").innerHTML = TABS.map(([id, t]) => `<button data-id="${id}">${t}</button>`).join("");
document.getElementById("tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) activate(b.dataset.id); });
let start = "story"; try { start = localStorage.getItem("valence-bible-tab") || "story"; } catch (e) {}
activate(TABS.some(([id]) => id === start) ? start : "story");
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
