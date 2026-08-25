/* ============================================================
   Dashboard logic (dashboard.html)
   - Shows only the logged-in user's own items (client-side filter
     on the stored user_id)
   - Create / Edit / Delete / Mark as Resolved via the real API
   ============================================================ */

let myItems = [];

const STAMP_MAP = { LOST: "lost", FOUND: "found", SERVICE: "service" };

function dashCardHtml(item) {
  const isResolved = item.status === "RESOLVED";
  return `
    <article class="ticket" data-id="${escapeHtml(item.item_id)}">
      <div class="ticket-thumb">
        ${item.image_url
          ? `<img src="${escapeHtml(Api.resolveImageUrl(item.image_url))}" alt="${escapeHtml(item.title)}">`
          : "No photo attached"}
        <span class="ticket-num mono">#${String(item.item_id).slice(-4).padStart(4, "0")}</span>
        <span class="stamp ${isResolved ? "resolved" : (STAMP_MAP[item.category] || "lost")}">${isResolved ? "Resolved" : item.category}</span>
      </div>
      <div class="ticket-body">
        <h3 class="ticket-title">${escapeHtml(item.title)}</h3>
        <p class="ticket-meta">
          <span>📍 ${escapeHtml(item.location)}</span>
          <span>🗓 ${formatDate(item.created_at)}</span>
        </p>
        <span class="status-pill ${isResolved ? "resolved" : "open"}">${isResolved ? "Resolved" : "Open"}</span>
      </div>
      <div class="ticket-actions">
        <button class="btn btn-sm edit-btn">Edit</button>
        <button class="btn btn-sm resolve-btn">${isResolved ? "Reopen" : "Mark resolved"}</button>
        <button class="btn btn-sm btn-danger delete-btn">Delete</button>
      </div>
    </article>
  `;
}

function renderDash() {
  const grid = document.getElementById("dash-grid");
  const emptyState = document.getElementById("empty-state");
  document.getElementById("result-count").textContent = `${myItems.length} posting${myItems.length === 1 ? "" : "s"}`;

  if (myItems.length === 0) {
    grid.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";
  grid.innerHTML = myItems.map(dashCardHtml).join("");
}

async function loadMyItems() {
  try {
    const user = Auth.getUser();
    const all = await Api.getItems();
    // Client-side filter by the stored user_id.
    myItems = user ? all.filter(i => Number(i.user_id) === Number(user.user_id)) : [];
    renderDash();
  } catch (err) {
    showToast(err.message || "Could not load your posts.");
  }
}

function wireModal() {
  const overlay = document.getElementById("post-modal-overlay");
  const form = document.getElementById("post-form");
  const errorBox = document.getElementById("post-form-error");

  function openForEdit(item) {
    document.getElementById("post-modal-title").textContent = "Edit post";
    document.getElementById("f-id").value = item.item_id;
    document.getElementById("f-title").value = item.title;
    document.getElementById("f-category").value = item.category;
    document.getElementById("f-location").value = item.location;
    document.getElementById("f-description").value = item.description;
    document.getElementById("f-phone").value = item.contact_phone;
    document.getElementById("f-image").value = "";
    overlay.classList.add("open");
  }

  function openForCreate() {
    document.getElementById("post-modal-title").textContent = "Post an item";
    form.reset();
    document.getElementById("f-id").value = "";
    overlay.classList.add("open");
  }

  function close() {
    overlay.classList.remove("open");
    errorBox.classList.remove("show");
  }

  document.getElementById("open-post-btn").addEventListener("click", openForCreate);
  document.getElementById("close-modal-btn").addEventListener("click", close);
  document.getElementById("cancel-post-btn").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.remove("show");

    const id = document.getElementById("f-id").value;

    try {
      if (id) {
        // Full edit: multipart/form-data so an optional new image is uploaded.
        const fd = new FormData(form);
        fd.delete("id"); // hidden field is not part of the API contract
        await Api.updateItem(id, fd);
        showToast("Post updated.");
      } else {
        const fd = new FormData(form);
        fd.delete("id");
        await Api.createItem(fd);
        showToast("Posted to the board.");
      }
      close();
      loadMyItems();
    } catch (err) {
      errorBox.textContent = err.message || "Could not save changes.";
      errorBox.classList.add("show");
    }
  });

  document.getElementById("dash-grid").addEventListener("click", async (e) => {
    const card = e.target.closest(".ticket");
    if (!card) return;
    const id = card.dataset.id;
    const item = myItems.find(i => String(i.item_id) === id);
    if (!item) return;

    if (e.target.closest(".edit-btn")) {
      openForEdit(item);
    } else if (e.target.closest(".delete-btn")) {
      if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return;
      try {
        await Api.deleteItem(id);
        showToast("Post deleted.");
        loadMyItems();
      } catch (err) {
        showToast(err.message || "Could not delete this post.");
      }
    } else if (e.target.closest(".resolve-btn")) {
      const newStatus = item.status === "RESOLVED" ? "ACTIVE" : "RESOLVED";
      try {
        await Api.updateItem(id, { status: newStatus });
        showToast(newStatus === "RESOLVED" ? "Marked as resolved." : "Reopened.");
        loadMyItems();
      } catch (err) {
        showToast(err.message || "Could not update status.");
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!requireLogin("dashboard.html")) return;
  initNav("dashboard");
  wireModal();
  loadMyItems();
});
