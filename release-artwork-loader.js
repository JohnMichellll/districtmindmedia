(()=> {
  const norm = s => String(s || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const same = (a,b) => {
    const x = norm(a), y = norm(b);
    return x === y || x.replace(/\bthe\b/g,"").trim() === y.replace(/\bthe\b/g,"").trim();
  };

  async function json(url, timeoutMs = 9000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function imageLoads(url, timeoutMs = 9000) {
    return new Promise(resolve => {
      if (!url || typeof url !== "string") return resolve(false);
      const img = new Image();
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0);
      img.onerror = () => finish(false);
      img.referrerPolicy = "no-referrer";
      img.src = url;
    });
  }

  function pending(card) {
    card.classList.remove("has-release-art", "release-art-failed");
    card.classList.add("release-art-pending");
    card.dataset.imageStatus = "loading";
    card.style.setProperty("background-image", "linear-gradient(135deg,#191919,#343434)", "important");
    card.style.backgroundColor = "#171717";
    const label = card.querySelector("span");
    if (label) {
      label.style.opacity = "1";
      label.style.color = "#f7f5f1";
    }
  }

  function fallback(card, reason) {
    card.classList.remove("has-release-art", "release-art-pending");
    card.classList.add("release-art-failed");
    card.dataset.imageStatus = "failed";
    card.dataset.imageFailure = reason;
    const img = card.querySelector(".release-cover");
    if (img) img.remove();
    card.style.setProperty("background-image", "linear-gradient(135deg,#242424,#111)", "important");
    card.style.backgroundColor = "#171717";
    const label = card.querySelector("span");
    if (label) label.style.opacity = "1";
    console.warn("[District Mind release artwork] Artwork unavailable:", {
      artist: card.dataset.releaseArtist,
      title: card.dataset.releaseTitle,
      reason
    });
  }

  function setArt(card, url, alt) {
    const safeUrl = String(url).replace(/["']/g, "");
    let img = card.querySelector(".release-cover");
    if (!img) {
      img = document.createElement("img");
      img.className = "release-cover";
      card.prepend(img);
    }
    img.alt = alt || card.dataset.releaseTitle || "Release artwork";
    img.loading = "eager";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      if (!img.naturalWidth) return fallback(card, "empty-image");
      card.dataset.imageStatus = "loaded";
      card.classList.remove("release-art-failed", "release-art-pending", "release-text-card", "photo-pending", "photo-branded-fallback");
      card.classList.add("has-release-art");
      card.setAttribute("aria-label", img.alt);
      const label = card.querySelector("span");
      if (label) label.style.opacity = "0";
    };
    img.onerror = () => fallback(card, "image-request-failed");
    card.dataset.imageStatus = "loading";
    card.dataset.imageLoader = "release-artwork-loader";
    img.src = safeUrl;
    return true;
  }

  async function load() {
    const cards = [...document.querySelectorAll("[data-release-artist][data-release-title]")];
    if (!cards.length) return;

    await Promise.all(cards.map(async card => {
      const artist = card.dataset.releaseArtist || "";
      const title = card.dataset.releaseTitle || "";
      pending(card);
      card.dataset.imageLoader = "release-artwork-loader";

      const data = await json("/api/release-art?artist=" + encodeURIComponent(artist) +
        "&title=" + encodeURIComponent(title));
      if (data?.artwork && data?.verified && data.match &&
          same(data.match.artist, artist) &&
          (same(data.match.title, title) || same(data.match.album, title))) {
        if (await imageLoads(data.artwork)) {
          setArt(card, data.artwork, title + " by " + artist);
          return;
        }
      }

      const intel = await json("/api/artist-intel?q=" + encodeURIComponent(artist));
      const hit = (intel?.music || []).find(track =>
        same(track.title, title) || same(track.album, title)
      );
      if (hit?.artwork && await imageLoads(hit.artwork)) {
        setArt(card, hit.artwork, title + " by " + artist);
        return;
      }

      if (intel?.artistImage && same(title, artist) && await imageLoads(intel.artistImage)) {
        setArt(card, intel.artistImage, artist);
        return;
      }

      fallback(card, "no-verified-matching-artwork");
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load, { once: true });
  } else {
    load();
  }
})();