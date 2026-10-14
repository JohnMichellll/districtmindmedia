// Shared response hardening for Cloudflare Pages Functions.
// Static assets use the root _headers file; that file does not apply to Functions.
export async function onRequest({ request, next }) {
  const response = await next();
  const headers = new Headers(response.headers);

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    // API responses are dynamic and should not be cached by browsers or shared caches.
    headers.set("Cache-Control", "no-store");
  }

  // Keep HTML responses behind the same baseline policy used for static pages.
  const contentType = headers.get("content-type") || "";
  if (contentType.toLowerCase().includes("text/html")) {
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://formspree.io; img-src 'self' https: data:; media-src 'self' https:; font-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' https:; connect-src 'self' https:; frame-src 'self' https:; upgrade-insecure-requests"
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
