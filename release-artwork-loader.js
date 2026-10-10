(()=> {
  const norm = s => String(s || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const same = (a,b) => {
    const x = norm(a), y = norm(b);
    return x === y || x.replace(/\bthe\b/g,"").trim() === y.replace(/\bthe\b/g,"").trim();
  };

  async function json(url, timeoutMs = 5500) {
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
    let visual = card.querySelector(":scope > .dm-release-fallback");
    if (!visual) { visual = document.createElement("div"); visual.className = "dm-release-fallback"; visual.setAttribute("aria-hidden", "true"); card.prepend(visual); }
    visual.innerHTML = "<strong></strong><span></span>";
    visual.querySelector("strong").textContent = card.dataset.releaseTitle || "RELEASE ARTWORK";
    visual.querySelector("span").textContent = (card.dataset.releaseArtist || "DISTRICT MIND") + " / COVER IMAGE UNAVAILABLE";
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

  function setArt(card, url, alt, kind = "release-artwork") {
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
      card.querySelector(":scope > .dm-release-fallback")?.remove();
      card.classList.add("has-release-art");
      card.querySelector(":scope > .release-image-kind")?.remove();
      if (kind === "artist-portrait") {
        card.style.position = "relative";
        const kindLabel = document.createElement("span");
        kindLabel.className = "release-image-kind";
        kindLabel.textContent = "ARTIST PHOTO · COVER ART UNAVAILABLE";
        Object.assign(kindLabel.style, { position: "absolute", top: "10px", left: "10px", zIndex: "3", maxWidth: "calc(100% - 20px)", padding: "6px 8px", background: "rgba(0,0,0,.82)", color: "#fff", fontSize: "9px", fontWeight: "800", letterSpacing: ".08em", lineHeight: "1.3" });
        card.append(kindLabel);
      }
      card.setAttribute("aria-label", img.alt);
      const label = [...card.querySelectorAll("span")].find(s => !s.classList.contains("release-image-kind"));
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
    const photoManifest = await json("/assets/photo-manifest.json?v=20261010-jm2");

    await Promise.all(cards.map(async card => {
      const artist = card.dataset.releaseArtist || "";
      const title = card.dataset.releaseTitle || "";
      pending(card);
      card.dataset.imageLoader = "release-artwork-loader";

      // Owner-supplied cover art takes priority for John Michell when the manifest
      // has an exact title-to-artwork mapping. Never substitute this image for another song.
      const photoKey = card.dataset.photoKey || "";
      const ownerArt = photoManifest?.photos?.[photoKey];
      if (norm(artist) === "john michell" && ownerArt?.url && ownerArt.identity === "owner-supplied" &&
          (norm(title) === "drivin crazy" || norm(title) === "drivin crazy single") && await imageLoads(ownerArt.url)) {
        setArt(card, ownerArt.url, "Drivin Crazy — official John Michell cover artwork");
        return;
      }

      const data = await json("/api/release-art?artist=" + encodeURIComponent(artist) +
        "&title=" + encodeURIComponent(title));
      if (data?.artwork && data?.verified && data.match &&
          same(data.match.artist, artist) &&
          (same(data.match.title, title) || same(data.match.album, title))) {
        setArt(card, data.artwork, title + " by " + artist);
        return;
      }

      const portraitKey = norm(artist).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const verifiedPortrait = photoManifest?.photos?.[portraitKey];
      if (verifiedPortrait?.url && norm(verifiedPortrait.subject) === norm(artist) && await imageLoads(verifiedPortrait.url)) {
        setArt(card, verifiedPortrait.url, artist + " — artist portrait; release cover unavailable", "artist-portrait");
        return;
      }

      const intel = await json("/api/artist-intel?q=" + encodeURIComponent(artist));
      const hit = (intel?.music || []).find(track =>
        same(track.title, title) || same(track.album, title)
      );
      if (hit?.artwork) {
        setArt(card, hit.artwork, title + " by " + artist);
        return;
      }

      // If exact cover art cannot be verified, use the exact artist portrait as a clearly
      // labeled visual fallback rather than leaving a blank tile or implying it is cover art.
      if (intel?.artistImage) {
        setArt(card, intel.artistImage, artist + " — artist portrait; release cover unavailable", "artist-portrait");
        return;
      }

      if (intel?.artistImage && same(title, artist)) {
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