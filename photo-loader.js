(()=> {
  const FALLBACK_LABELS = {
    "john-michell": ["JOHN MICHELL", "DISTRICT MIND RECORDS"],
    "john-michell-drivin-crazy": ["DRIVIN CRAZY", "JOHN MICHELL"],
    "john-michell-who-is-you": ["WHO IS YOU", "JOHN MICHELL"],
    "john-michell-u": ["U", "JOHN MICHELL"]
  };
  const norm = s => String(s || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

  async function fetchJson(url, timeoutMs = 5500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function imageLoads(url, timeoutMs = 9000) {
    return new Promise(resolve => {
      if (!url || typeof url !== "string") return resolve(false);
      const img = new Image();
      let done = false;
      const finish = ok => {
        if (done) return;
        done = true;
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

  function applyImage(node, url, alt) {
    const safeUrl = String(url).replace(/["']/g, "");
    node.style.setProperty("background-image",
      'linear-gradient(180deg,rgba(17,17,17,.04),rgba(17,17,17,.48)),url("' + safeUrl + '")', "important");
    node.style.backgroundSize = "cover";
    node.style.backgroundPosition = "center";
    node.dataset.imageStatus = "loaded";
    node.setAttribute("aria-label", alt || node.dataset.photoKey || "Editorial photo");
    node.classList.remove("photo-pending", "photo-branded-fallback", "photo-load-error");
    node.querySelector(":scope > .dm-visual-fallback")?.remove();
  }

  function showFallback(node) {
    const key = node.dataset.photoKey || "district-mind-media";
    const labels = FALLBACK_LABELS[key] || [
      key.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()),
      "IMAGE NOT AVAILABLE"
    ];
    node.style.setProperty("background-image", "linear-gradient(135deg,#191919,#343434)", "important");
    node.dataset.imageStatus = "fallback";
    node.classList.add("photo-pending", "photo-branded-fallback");
    node.classList.remove("photo-load-error");
    node.dataset.photoLabel = labels[0];
    node.dataset.photoSub = labels[1];
    let visual = node.querySelector(":scope > .dm-visual-fallback");
    if (!visual) { visual = document.createElement("div"); visual.className = "dm-visual-fallback"; visual.setAttribute("aria-hidden", "true"); node.prepend(visual); }
    visual.innerHTML = "<strong></strong><span></span>";
    visual.querySelector("strong").textContent = labels[0];
    visual.querySelector("span").textContent = labels[1];
  }

  async function loadPhotos() {
    const nodes = [...document.querySelectorAll("[data-photo-key]")].filter(node => !(node.dataset.releaseArtist && node.dataset.releaseTitle));
    if (!nodes.length) return;

    nodes.forEach(node => {
      // Never leave a white/empty tile while external artist imagery is resolving.
      showFallback(node);
      node.dataset.imageStatus = "loading";
      node.dataset.imageLoader = "photo-loader";
    });

    const manifest = await fetchJson("/assets/photo-manifest.json?v=20261010");
    const artistCache = new Map();

    await Promise.all(nodes.map(async node => {
      const key = node.dataset.photoKey || "";
      const photo = manifest?.photos?.[key];

      if (photo?.url && await imageLoads(photo.url)) {
        applyImage(node, photo.url, photo.alt || key);
        return;
      }

      const artist = (node.dataset.photoArtist ||
        (key.startsWith("john-michell") ? "John Michell" : "")).trim();

      // Owner's own release cards must try exact catalog artwork before falling
      // back to a generic artist portrait. Never substitute another artist's image.
      const ownReleases = {
        "john-michell-drivin-crazy": "Drivin Crazy",
        "john-michell-who-is-you": "WHO IS YOU",
        "john-michell-u": "U"
      };
      const releaseTitle = node.dataset.releaseTitle || ownReleases[key] || "";
      if (artist && releaseTitle) {
        const release = await fetchJson(
          "/api/release-art?artist=" + encodeURIComponent(artist) +
          "&title=" + encodeURIComponent(releaseTitle)
        );
        if (release?.verified && release?.artwork && release?.match &&
            norm(release.match.artist) === norm(artist) &&
            (norm(release.match.title) === norm(releaseTitle) ||
             norm(release.match.album) === norm(releaseTitle)) &&
            await imageLoads(release.artwork)) {
          applyImage(node, release.artwork, releaseTitle + " by " + artist);
          return;
        }
      }

      if (artist) {
        const artistKey = norm(artist);
        if (!artistCache.has(artistKey)) {
          artistCache.set(artistKey, fetchJson(
            "/api/artist-intel?q=" + encodeURIComponent(artist) + "&image_probe=1"
          ));
        }
        const data = await artistCache.get(artistKey);
        const imageUrl = data?.artistImage;
        if (imageUrl && await imageLoads(imageUrl)) {
          applyImage(node, imageUrl, artist + " — verified artist image");
          return;
        }
      }

      showFallback(node);
      node.dataset.imageStatus = "failed";
      node.classList.add("photo-load-error");
      console.warn("[District Mind image loader] No usable image for:", key, {
        manifestEntry: Boolean(photo?.url),
        artistFallbackTried: Boolean(artist)
      });
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPhotos, { once: true });
  } else {
    loadPhotos();
  }
})();