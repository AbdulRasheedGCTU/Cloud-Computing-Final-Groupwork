/* ============================================================
   Shared header behavior + small DOM/text helpers used by every page.
   ============================================================ */

function initNav(activePage) {
  document.querySelectorAll(`[data-nav="${activePage}"]`).forEach(el => el.classList.add("active"));

  const chip = document.getElementById("user-chip");
  const loginLink = document.getElementById("nav-login");
  const dashLink = document.getElementById("nav-dashboard");

  const user = Auth.getUser();
  if (user && Auth.isLoggedIn()) {
    if (chip) {
      chip.style.display = "inline-flex";
      chip.innerHTML = `<span>${escapeHtml(user.full_name)}</span><button class="btn-ghost mono" id="logout-btn" style="border:none;background:none;cursor:pointer;font-weight:700;">Log out</button>`;
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) logoutBtn.addEventListener("click", () => {
        Auth.clearSession();
        window.location.href = "index.html";
      });
    }
    if (loginLink) loginLink.style.display = "none";
    if (dashLink) dashLink.style.display = "inline";
  } else {
    if (dashLink) dashLink.style.display = "none";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function requireLogin(redirectTo) {
  if (!Auth.isLoggedIn()) {
    window.location.href = `login.html?next=${encodeURIComponent(redirectTo || "dashboard.html")}`;
    return false;
  }
  return true;
}
