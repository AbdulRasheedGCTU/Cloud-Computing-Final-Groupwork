/* ============================================================
   Feed page logic (index.html)
   - Renders the public feed from GET /api/items (ACTIVE only)
   - All / Lost / Found / Services filters
   - "Post an item" modal → POST /api/items (multipart/form-data)
   - Card click → detail modal → GET /api/items/:id
   ============================================================ */

let allItems = [];
let activeFilter = "All"; // "All" | "Lost" | "Found" | "Services"

const FILTER_TO_CATEGORY = {
  All: null,
  Lost: "LOST",
  Found: "FOUND",
  Services: "SERVICE"
};

const STAMP_CLASS = { LOST: "lost", FOUND: "found", SERVICE: "service" };

function ticketCardHtml(item) {
  const stampClass = STAMP_CLASS[item.category] || "lost";
  const desc = escapeHtml(item.description);
  return `
    <article class="ticket clickable" data-id="${escapeHtml(item.item_id)}">
      <div class="ticket-thumb">
        ${item.image_url
          ? `<img src="${escapeHtml(Api.resolveImageUrl(item.image_url))}" alt="${escapeHtml(item.title)}">`
          : "No photo attached"}
        <span class="ticket-num mono">#${String(item.item_id).slice(-4).padStart(4, "0")}</span>
        <span class="stamp ${stampClass}">${escapeHtml(item.category)}</span>
      </div>
      <div class="ticket-body">
        <h3 class="ticket-title">${escapeHtml(item.title)}</h3>
        <p class="ticket-meta">
          <span>📍 ${escapeHtml(item.location)}</span>
          <span>🗓 ${formatDate(item.created_at)}</span>
        </p>
        <p class="ticket-meta" style="color:var(--ink);">
          ${desc.slice(0, 90)}${item.description.length > 90 ? "…" : ""}
        </p>
        <p class="ticket-meta">👤 ${escapeHtml(item.full_name)}</p>
      </div>
    </article>
  `;
}

function visibleItems() {
  const category = FILTER_TO_CATEGORY[activeFilter];
  return allItems.filter(item => {
    if (item.status !== "ACTIVE") return false; // public feed: active listings only
    if (category && item.category !== category) return false;
    return true;
  });
}

function renderFeed() {
  const grid = document.getElementById("feed-grid");
  const emptyState = document.getElementById("empty-state");
  const countEl = document.getElementById("result-count");

  const filtered = visibleItems();
  countEl.textContent = `${filtered.length} posting${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";
  grid.innerHTML = filtered.map(ticketCardHtml).join("");
}

async function loadFeed() {
  try {
    allItems = await Api.getItems();
    renderFeed();
  } catch (err) {
    document.getElementById("feed-grid").innerHTML = "";
    showToast(err.message || "Could not load the feed.");
  }
}

function wireFilters() {
  document.getElementById("filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-chip");
    if (!btn) return;
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderFeed();
  });
}

/* ---------- Detail modal (GET /api/items/:id) ---------- */

function wireDetailModal() {
  const overlay = document.getElementById("detail-modal-overlay");
  const closeBtn = document.getElementById("detail-close-btn");

  function close() {
    overlay.classList.remove("open");
    document.getElementById("detail-thumb").innerHTML = "No photo attached";
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  document.getElementById("feed-grid").addEventListener("click", async (e) => {
    const card = e.target.closest(".ticket");
    if (!card) return;
    const itemId = card.dataset.id;

    try {
      const item = await Api.getItem(itemId);
      document.getElementById("detail-title").textContent = item.title;

      const thumb = document.getElementById("detail-thumb");
      thumb.innerHTML = item.image_url
        ? `<img src="${escapeHtml(Api.resolveImageUrl(item.image_url))}" alt="${escapeHtml(item.title)}">`
        : "No photo attached";

      const stamp = document.getElementById("detail-category");
      stamp.textContent = item.status === "RESOLVED" ? "Resolved" : item.category;
      stamp.className = `stamp ${item.status === "RESOLVED" ? "resolved" : (STAMP_CLASS[item.category] || "lost")}`;

      document.getElementById("detail-meta").innerHTML =
        `<span>📍 ${escapeHtml(item.location)}</span>` +
        `<span>🗓 ${formatDate(item.created_at)}</span>` +
        `<span>👤 ${escapeHtml(item.full_name)}</span>`;

      document.getElementById("detail-description").textContent = item.description;
      document.getElementById("detail-contact").innerHTML =
        `📞 Contact: <strong>${escapeHtml(item.contact_phone)}</strong>`;

      overlay.classList.add("open");
    } catch (err) {
      showToast(err.message || "Could not load item details.");
    }
  });
}

/* ---------- Post modal (POST /api/items, multipart/form-data) ---------- */

function wirePostModal() {
  const overlay = document.getElementById("post-modal-overlay");
  const openBtn = document.getElementById("open-post-btn");
  const closeBtn = document.getElementById("close-modal-btn");
  const cancelBtn = document.getElementById("cancel-post-btn");
  const form = document.getElementById("post-form");
  const errorBox = document.getElementById("post-form-error");

  function open() {
    if (!requireLogin("index.html")) return;
    overlay.classList.add("open");
  }
  function close() {
    overlay.classList.remove("open");
    form.reset();
    errorBox.classList.remove("show");
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.remove("show");

    // Send the whole form as multipart/form-data — the backend expects
    // title, description, category, location, contact_phone and image.
    const fd = new FormData(form);

    try {
      await Api.createItem(fd);
      close();
      showToast("Posted to the board.");
      loadFeed();
    } catch (err) {
      errorBox.textContent = err.message || "Could not post this item.";
      errorBox.classList.add("show");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNav("feed");
  wireFilters();
  wireDetailModal();
  wirePostModal();
  loadFeed();
});

