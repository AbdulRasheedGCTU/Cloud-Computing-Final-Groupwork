/* Handles both login.html and register.html — whichever form exists on the page. */

function getNextUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("next") || "dashboard.html";
}

document.addEventListener("DOMContentLoaded", () => {
  initNav(document.getElementById("login-form") ? "login" : "register");

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorBox = document.getElementById("login-error");
      errorBox.classList.remove("show");

      const email = document.getElementById("l-email").value.trim();
      const password = document.getElementById("l-password").value;

      try {
        const { user, token } = await Api.login(email, password);
        Auth.setSession(user, token);
        window.location.href = getNextUrl();
      } catch (err) {
        errorBox.textContent = err.message || "Log in failed. Check your details and try again.";
        errorBox.classList.add("show");
      }
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorBox = document.getElementById("register-error");
      errorBox.classList.remove("show");

      const name = document.getElementById("r-name").value.trim();
      const email = document.getElementById("r-email").value.trim();
      const password = document.getElementById("r-password").value;

      if (password.length < 8) {
        errorBox.textContent = "Password must be at least 8 characters.";
        errorBox.classList.add("show");
        return;
      }

      try {
        // POST /api/auth/register returns the created user (no token yet),
        // so we log straight in with the same credentials to get the JWT.
        await Api.register(name, email, password);
        const { user, token } = await Api.login(email, password);
        Auth.setSession(user, token);
        window.location.href = "dashboard.html";
      } catch (err) {
        errorBox.textContent = err.message || "Registration failed. Please try again.";
        errorBox.classList.add("show");
      }
    });
  }
});
