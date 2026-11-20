// Browser fixtures resolve current public URLs from permanent recitation IDs.
const catalogs = new WeakMap();
export async function lyricSourceUrl(request, id) {
  if (!catalogs.has(request)) catalogs.set(request, request.get("/data/recitation-lyric-catalog.json").then(async response => {
    if (!response.ok()) throw Error("Built lyric catalog unavailable");
    return response.json();
  }));
  const lyric = (await catalogs.get(request)).find(item => item.id === id);
  if (!lyric?.sourceUrl) throw Error("Published lyric ID missing: " + id);
  return lyric.sourceUrl;
}
