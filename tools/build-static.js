const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const sourcePath = "/tmp/altarab_source.html";
const outDir = root;
const assetDir = path.join(root, "assets");

function extractBalancedDiv(html, id) {
  const start = html.indexOf(`<div id="${id}"`);
  if (start < 0) throw new Error(`Could not find #${id}`);
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tagRe.exec(html))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) return html.slice(start, tagRe.lastIndex);
    } else {
      depth += 1;
    }
  }
  throw new Error(`Could not close #${id}`);
}

function cleanBlockHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style>\s*\.blank-template-body[\s\S]*?<\/style>/g, "")
    .replace(/\sdata-ss-[a-z-]+=(?:"[^"]*"|'[^']*')/g, "")
    .replace(/\sdata-(?:course-id|release-date|days-until-dripped|is-dripped-by-date)=(?:"[^"]*"|'[^']*')/g, "")
    .replace(/\sclass='hotmart_video_player public-hotmart-video'[\s\S]*?<\/div>/g, " class=\"video-placeholder\"><p>講師 添削動画サンプル</p></div>")
    .replace(/<form[\s\S]*?<\/form>/g, '<a href="mailto:info@tomody.com?subject=Al%20Tarab%20ONLINE%20and%20CLOUD%20%E5%8F%97%E8%AC%9B%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6" class="enroll-button enroll-button-color"><i class="far fa-play-circle"></i>&nbsp;&nbsp;受講する</a>')
    .replace(/\s+href='\/courses\//g, " href='https://school.tomody.com/courses/")
    .replace(/\s+href="\/courses\//g, ' href="https://school.tomody.com/courses/')
    .replace(/\s+href='\/sign_in'/g, " href='https://school.tomody.com/sign_in'")
    .replace(/\s+href='\/sign_up'/g, " href='https://school.tomody.com/sign_up'")
    .replace(/\s+href="\/purchase"/g, ' href="mailto:info@tomody.com"')
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, ">\n<")
    .trim();
}

function firstStyle(html) {
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  return match ? match[1] : "";
}

function urlsFrom(text) {
  const urls = new Set();
  const re = /https:\/\/(?:uploads\.teachablecdn\.com|static-media\.hotmart\.com)\/[^"')\s<>]+/g;
  let match;
  while ((match = re.exec(text))) urls.add(match[0].replace(/&amp;/g, "&"));
  return [...urls];
}

function extFor(url, contentType) {
  const clean = decodeURIComponent(url.split("?")[0]);
  const fromPath = clean.match(/\.([a-z0-9]+)$/i);
  if (fromPath) return fromPath[1].toLowerCase().replace("jpeg", "jpg");
  if (contentType && contentType.includes("svg")) return "svg";
  if (contentType && contentType.includes("png")) return "png";
  if (contentType && contentType.includes("webp")) return "webp";
  return "jpg";
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const ext = extFor(url, response.headers.get("content-type"));
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
  const basename = decodeURIComponent(url.split("/").pop().split("?")[0]).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${hash}-${basename || "asset"}.${basename.includes(".") ? "" : ext}`.replace(/\.$/, "");
  const out = path.join(assetDir, filename);
  fs.writeFileSync(out, bytes);
  return `assets/${filename}`;
}

async function main() {
  fs.mkdirSync(assetDir, { recursive: true });
  const source = fs.readFileSync(sourcePath, "utf8");
  const blocks = cleanBlockHtml(extractBalancedDiv(source, "blocks"));
  const originalCss = firstStyle(source);
  let body = blocks;
  let css = originalCss;

  const allUrls = urlsFrom(`${body}\n${css}`);
  const replacements = new Map();
  for (const url of allUrls) {
    try {
      replacements.set(url, await download(url));
    } catch (error) {
      console.warn(`Keeping remote asset: ${url} (${error.message})`);
    }
  }
  for (const [from, to] of replacements) {
    body = body.split(from).join(to);
    css = css.split(from).join(to);
  }

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Al Tarab ONLINE and CLOUD | tomody</title>
  <meta name="description" content="マインドマップでさくさく出来る！クラウドレッスンで力を付ける！ベリーダンス基礎辞典">
  <meta property="og:title" content="Al Tarab ONLINE ＆ CLOUD">
  <meta property="og:description" content="マインドマップでさくさく出来る！クラウドレッスンで力を付ける！ベリーダンス基礎辞典">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="#top" aria-label="tomody">
      <img src="${replacements.get("https://uploads.teachablecdn.com/attachments/ISJvyjzpSluBWuIO5bJe_tomody_allwh.svg") || "assets/tomody.svg"}" alt="tomody">
    </a>
    <nav class="site-nav">
      <a href="#course-sec-b">受講プラン</a>
      <a href="https://school.tomody.com/sign_in">ログイン</a>
    </nav>
  </header>
  <main id="top">
${body}
  </main>
  <footer class="site-footer">
    <img src="${replacements.get("https://uploads.teachablecdn.com/attachments/ISJvyjzpSluBWuIO5bJe_tomody_allwh.svg") || "assets/tomody.svg"}" alt="tomody">
    <p>Copyright © tomody</p>
    <nav>
      <a href="https://school.tomody.com/p/terms">利用規約</a>
      <a href="https://school.tomody.com/p/privacy">プライバシーポリシー</a>
      <a href="https://tomody.com/contact/contact.html">お問い合わせ</a>
    </nav>
  </footer>
  <script>
    document.querySelectorAll('[data-toggle="collapse"], #more_lecture_sections').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const target = document.querySelector(button.getAttribute('href') || button.dataset.target);
        if (target) target.classList.toggle('show');
      });
    });
  </script>
</body>
</html>
`;

  const baseCss = `:root{--ink:#2b3636;--green:#09a59a;--deep:#008789;--blue:#245a86;--soft:#fafafa}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);font-family:"Noto Sans JP",Hiragino Kaku Gothic ProN,Meiryo,sans-serif;line-height:1.8;background:#fff}a{color:#009b87;text-decoration:none}a:hover{text-decoration:underline}img{max-width:100%;height:auto}.site-header{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px clamp(18px,4vw,54px);background:#2b3636;box-shadow:0 2px 18px rgba(0,0,0,.18)}.brand img{display:block;width:142px}.site-nav{display:flex;align-items:center;gap:20px;font-size:14px}.site-nav a{color:#fff}.container{width:min(1100px,100% - 32px);margin-inline:auto}.row{display:flex;flex-wrap:wrap;margin-inline:-15px}.row>[class*=col-]{padding-inline:15px}.col-xs-10{width:83.333%}.col-xs-offset-1{margin-left:8.333%}.col-sm-2{width:16.666%}.col-sm-4{width:33.333%}.col-sm-10{width:83.333%}.col-sm-12{width:100%}.col-md-8{width:66.666%}.col-md-offset-2{margin-left:16.666%}.text-center{text-align:center}.pull-right{float:right}.btn,.button,button{display:inline-flex;align-items:center;justify-content:center;gap:.35em;border:0;border-radius:999px;background:var(--green);color:#fff;font-weight:700;line-height:1.2;padding:14px 30px;cursor:pointer}.btn:hover,.button:hover,button:hover{text-decoration:none;filter:brightness(.95)}.btn-default{background:#fff;color:#2b3636;border:1px solid #ddd}.btn-sm{font-size:12px;padding:7px 13px}.btn-hg{font-size:18px;padding:18px 36px}.course-block{padding:0}.course-description{padding-block:56px;font-size:16px}.course-description h2,.course-block h2{font-size:30px;text-align:center;font-weight:500;color:#2b3636}.full-width-image-bg{min-height:230px;background-size:cover!important;background-position:center!important;display:grid;place-items:center;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.35)}.collapse{display:none}.collapse.show{display:block}.card{max-width:1100px;margin:auto}.video-placeholder{aspect-ratio:16/9;background:#121212;color:#fff;display:grid;place-items:center;border-radius:8px}.course-section{margin-bottom:22px}.section-title{background:#2b3636;color:#fff;padding:15px 18px;border-radius:4px 4px 0 0;font-weight:700}.section-days-to-drip{display:none}.section-list{margin:0 0 18px;padding:0;border:1px solid #ddd;border-top:0}.section-item{list-style:none;border-top:1px solid #eee}.section-item:first-child{border-top:0}.section-item .item{display:block;padding:14px 16px;color:#2b3636}.lecture-icon{display:inline-block;width:24px;color:#09a59a}.lecture-start,.lecture-preview{background:#09a59a;color:#fff;border-radius:999px;padding:4px 10px;font-size:12px}.site-footer{background:#2b3636;color:#b8c2c2;text-align:center;padding:44px 20px}.site-footer img{width:150px;margin-bottom:18px}.site-footer nav{display:flex;gap:18px;justify-content:center;flex-wrap:wrap}.site-footer a{color:#fff}@media(max-width:900px){.col-md-8,.col-xs-10{width:100%;margin-left:0}.col-sm-2,.col-sm-4,.col-sm-10,.col-sm-12{width:100%}.row{margin-inline:0}.row>[class*=col-]{padding-inline:0}.site-header{position:relative}.site-nav{gap:14px}.course-description{padding:42px 18px}.btn-hg{font-size:16px;padding:15px 28px}}`;
  fs.writeFileSync(path.join(outDir, "styles.css"), `${baseCss}\n\n${css}\n`);
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log(`Wrote index.html, styles.css and ${replacements.size} assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
