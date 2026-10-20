import fs from "node:fs";

const destinations = JSON.parse(fs.readFileSync(new URL("../src/data/destinations.json", import.meta.url), "utf8"));
const uniqueUrls = [...new Set(destinations.map(d => d.image))];
const concurrency = 5;
const timeoutMs = 10000;
const failures = [];
const inconclusive = [];
let next = 0;

async function checkImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0", "User-Agent": "Roamwise-Image-Audit/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    const type = response.headers.get("content-type") || "";
    if (response.status === 429) {
      inconclusive.push({ url, reason: "rate limited by host" });
      console.warn(`WARN rate-limited; unable to verify ${url}`);
    } else if (!response.ok || !type.toLowerCase().startsWith("image/")) {
      failures.push({ url, status: response.status, contentType: type || "missing" });
      console.error(`FAIL ${response.status} ${type || "no content-type"} ${url}`);
    } else {
      console.log(`OK   ${response.status} ${type} ${url}`);
    }
    if (response.body) await response.body.cancel().catch(() => {});
  } catch (error) {
    failures.push({ url, error: error.name === "AbortError" ? "timeout" : error.message });
    console.error(`FAIL ${error.name === "AbortError" ? "timeout" : error.message} ${url}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function worker() {
  while (next < uniqueUrls.length) {
    const url = uniqueUrls[next++];
    await checkImage(url);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, uniqueUrls.length) }, worker));
console.log(`\nChecked ${uniqueUrls.length} unique destination image URLs; ${failures.length} failed, ${inconclusive.length} inconclusive (rate-limited).`);
if (failures.length) process.exitCode = 1;
