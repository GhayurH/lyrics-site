// Stable, short public URL. Never include edit capabilities in redirects.
export function onRequestGet({ params, request }) {
  if (!/^[a-f0-9]{24}$/.test(params.id)) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  url.pathname = "/recite/read/";
  url.search = "?set=" + encodeURIComponent(params.id);
  url.hash = "";
  return Response.redirect(url.toString(), 302);
}
