(function () {
  "use strict";

  const API_DEFAULT = "http://127.0.0.1:8000";
  const PAGE_SIZE = 12;
  const state = {
    apiUrl: normalizeApiUrl(localStorage.getItem("postmarkApiUrl") || API_DEFAULT),
    token: localStorage.getItem("postmarkToken"),
    email: localStorage.getItem("postmarkEmail") || "",
    view: "feed",
    posts: [],
    skip: 0,
    hasMore: false,
    loading: false,
    reloadRequested: false,
    editingId: null,
    searchTimer: null,
    toastTimer: null,
    likedIds: new Set()
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    authScreen: $("#auth-screen"),
    appShell: $("#app-shell"),
    authForm: $("#auth-form"),
    authEmail: $("#auth-email"),
    authPassword: $("#auth-password"),
    authTitle: $("#auth-title"),
    authSubtitle: $("#auth-subtitle"),
    authSubmit: $("#auth-submit"),
    authSwitch: $("#auth-switch"),
    authSwitchLabel: $("#auth-switch-label"),
    authError: $("#auth-error"),
    authApiUrl: $("#auth-api-url"),
    appApiUrl: $("#app-api-url"),
    settingsPopover: $("#settings-popover"),
    search: $("#search-input"),
    feedHeading: $("#feed-heading"),
    feedEyebrow: $("#feed-eyebrow"),
    feedDescription: $("#feed-description"),
    postList: $("#post-list"),
    feedStatus: $("#feed-status"),
    emptyState: $("#empty-state"),
    emptyTitle: $("#empty-title"),
    emptyDescription: $("#empty-description"),
    loadMore: $("#load-more"),
    sidebarEmail: $("#sidebar-email"),
    profileEmail: $("#profile-email"),
    postDialog: $("#post-dialog"),
    postForm: $("#post-form"),
    postTitle: $("#post-title"),
    postContent: $("#post-content"),
    postPublished: $("#post-published"),
    postError: $("#post-error"),
    postSubmit: $("#post-submit"),
    dialogTitle: $("#dialog-title"),
    dialogEyebrow: $("#dialog-eyebrow"),
    toast: $("#toast")
  };

  function normalizeApiUrl(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function initials(email) {
    const name = (email || "P").split("@")[0].replace(/[._-]+/g, " ").trim();
    return (name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("") || "P").toUpperCase();
  }

  function likedStorageKey() {
    return `postmarkLiked:${state.email.toLowerCase()}`;
  }

  function loadLikedIds() {
    try {
      const saved = JSON.parse(localStorage.getItem(likedStorageKey()) || "[]");
      state.likedIds = new Set(Array.isArray(saved) ? saved.map(Number) : []);
    } catch (error) {
      state.likedIds = new Set();
      showToast("Saved like preferences couldn’t be read; continuing with an empty local list.");
    }
  }

  function saveLikedIds() {
    localStorage.setItem(likedStorageKey(), JSON.stringify([...state.likedIds]));
  }

  function showToast(message) {
    clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("visible");
    state.toastTimer = setTimeout(() => els.toast.classList.remove("visible"), 3300);
  }

  function setFeedStatus(message, loading) {
    els.feedStatus.textContent = message || "";
    els.feedStatus.classList.toggle("hidden", !message);
    els.feedStatus.classList.toggle("loading", Boolean(loading));
  }

  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }

  async function api(path, options) {
    const settings = options || {};
    const headers = new Headers(settings.headers || {});
    if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
    if (settings.body && !(settings.body instanceof URLSearchParams)) {
      headers.set("Content-Type", "application/json");
    }
    let response;
    try {
      response = await fetch(`${state.apiUrl}${path}`, { ...settings, headers });
    } catch (error) {
      throw new ApiError(`Could not reach ${state.apiUrl}. Check that the FastAPI server is running and the backend URL is correct.`, 0);
    }
    if (!response.ok) {
      let message = `Request failed (${response.status}).`;
      try {
        const body = await response.json();
        if (typeof body.detail === "string") message = body.detail;
        else if (Array.isArray(body.detail)) message = body.detail.map((item) => item.msg || "Invalid input").join(", ");
      } catch (error) {
        if (response.status !== 204) message = `Request failed (${response.status}); the server returned an unreadable response.`;
      }
      throw new ApiError(message, response.status);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function setApiUrl(value) {
    const cleaned = normalizeApiUrl(value);
    let parsed;
    try {
      parsed = new URL(cleaned);
    } catch (error) {
      showToast("Enter a valid backend URL, such as http://127.0.0.1:8000.");
      return false;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      showToast("The backend URL must use HTTP or HTTPS.");
      return false;
    }
    state.apiUrl = cleaned;
    localStorage.setItem("postmarkApiUrl", cleaned);
    els.authApiUrl.value = cleaned;
    els.appApiUrl.value = cleaned;
    showToast("Backend URL saved.");
    return true;
  }

  function showAuth() {
    els.authScreen.classList.remove("hidden");
    els.appShell.classList.add("hidden");
  }

  function showApp() {
    els.authScreen.classList.add("hidden");
    els.appShell.classList.remove("hidden");
    els.sidebarEmail.textContent = state.email;
    els.profileEmail.textContent = state.email;
    const avatar = initials(state.email);
    $("#sidebar-avatar").textContent = avatar;
    $("#composer-avatar").textContent = avatar;
    $("#profile-avatar").textContent = avatar;
  }

  function clearSession() {
    state.token = "";
    state.email = "";
    localStorage.removeItem("postmarkToken");
    localStorage.removeItem("postmarkEmail");
    state.posts = [];
    state.likedIds = new Set();
  }

  function updateAuthMode(isRegistering) {
    els.authForm.dataset.mode = isRegistering ? "register" : "login";
    els.authTitle.textContent = isRegistering ? "Create your account" : "Welcome back";
    els.authSubtitle.textContent = isRegistering ? "A few details and you’re in." : "Sign in to pick up where you left off.";
    els.authSubmit.innerHTML = isRegistering ? 'Create account <span aria-hidden="true">↗</span>' : 'Sign in <span aria-hidden="true">↗</span>';
    els.authSwitchLabel.textContent = isRegistering ? "Already have an account?" : "New around here?";
    els.authSwitch.textContent = isRegistering ? "Sign in" : "Create an account";
    els.authPassword.autocomplete = isRegistering ? "new-password" : "current-password";
  }

  function normalizePost(item) {
    if (item && item.post) return { post: item.post, votes: Number(item.votes) || 0 };
    return { post: item, votes: null };
  }

  async function loadFeed(reset) {
    if (state.loading) {
      state.reloadRequested = true;
      return;
    }
    if (reset) {
      state.skip = 0;
      state.posts = [];
    }
    state.loading = true;
    setFeedStatus(state.skip ? "Loading more posts…" : "Finding the good stuff…", true);
    els.loadMore.classList.add("hidden");
    els.emptyState.classList.add("hidden");
    try {
      let response;
      if (state.view === "mine") {
        response = await api("/posts/mypost");
        state.posts = response.map(normalizePost);
        state.hasMore = false;
      } else {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(state.skip) });
        const query = els.search.value.trim();
        if (query) params.set("search", query);
        try {
          response = await api(`/posts/?${params}`);
        } catch (error) {
          if (error.status === 404 && error.message.toLowerCase().includes("no posts")) response = [];
          else throw error;
        }
        const page = response.map(normalizePost);
        state.posts = reset ? page : state.posts.concat(page);
        state.skip += page.length;
        state.hasMore = page.length === PAGE_SIZE;
      }
      renderPosts();
      setFeedStatus("", false);
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        showAuth();
        els.authError.textContent = "Your session expired. Please sign in again.";
      } else {
        setFeedStatus(error.message || "Posts couldn’t be loaded. Try again.", false);
      }
    } finally {
      state.loading = false;
      if (state.reloadRequested) {
        state.reloadRequested = false;
        loadFeed(true);
      }
    }
  }

  function renderPosts() {
    const list = els.postList;
    list.innerHTML = state.posts.map((item) => {
      const post = item.post || {};
      const ownerEmail = post.owner && post.owner.email ? post.owner.email : "Community member";
      const liked = state.likedIds.has(Number(post.id));
      const voteLabel = item.votes === null ? "— likes" : `${item.votes} ${item.votes === 1 ? "like" : "likes"}`;
      const timestamp = post.created_at ? formatDate(post.created_at) : `Post #${post.id}`;
      const ownPost = post.owner_id !== undefined && String(post.owner_id) === String(post.owner && post.owner.id);
      const canManage = state.view === "mine" || ownPost;
      const safeTitle = escapeHtml(post.title || "Untitled post");
      const content = escapeHtml(post.content || "");
      const shouldCollapse = content.length > 260 || content.split("\n").length > 4;
      return `<article class="post-card" data-post-id="${escapeHtml(post.id)}">
        <header class="post-card-header">
          <span class="avatar ${avatarTone(ownerEmail)}">${escapeHtml(initials(ownerEmail))}</span>
          <div class="post-author"><b>${escapeHtml(ownerEmail)}</b><span>${escapeHtml(timestamp)}</span></div>
          ${canManage ? `<details class="post-menu"><summary aria-label="Post actions">···</summary><div class="post-menu-actions">
            <button data-action="edit-post" data-id="${escapeHtml(post.id)}" type="button">Edit post</button>
            <button class="delete-action" data-action="delete-post" data-id="${escapeHtml(post.id)}" type="button">Delete post</button>
          </div></details>` : ""}
        </header>
        <h2 class="post-title">${safeTitle}</h2>
        <p class="post-content${shouldCollapse ? " collapsed" : ""}">${content}</p>
        ${shouldCollapse ? '<button class="read-more" data-action="read-more" type="button">Read more</button>' : ""}
        <footer class="post-card-footer">
          <div class="post-actions-left">
            <button class="vote-button${liked ? " liked" : ""}" data-action="vote" data-id="${escapeHtml(post.id)}" type="button" aria-pressed="${liked}" aria-label="${liked ? "Unlike" : "Like"} this post">
              <span class="vote-heart" aria-hidden="true">${liked ? "♥" : "♡"}</span><span>${liked ? "Liked" : "Like"}</span>
            </button>
            <span class="post-count">${escapeHtml(voteLabel)}</span>
          </div>
          <span class="published-pill${post.published ? "" : " draft"}">${post.published ? "PUBLISHED" : "DRAFT"}</span>
        </footer>
      </article>`;
    }).join("");

    const isEmpty = state.posts.length === 0;
    els.emptyState.classList.toggle("hidden", !isEmpty);
    els.postList.classList.toggle("hidden", isEmpty);
    els.loadMore.classList.toggle("hidden", !state.hasMore || state.view !== "feed");
    $("#empty-title").textContent = state.view === "mine"
      ? "Your story starts here."
      : (els.search.value.trim() ? "No matching posts yet." : "It’s a little quiet here.");
    $("#empty-description").textContent = state.view === "mine"
      ? "Share a thought and it’ll show up here."
      : (els.search.value.trim() ? "Try another title, or be the first to write about it." : "Be the first to share a thought with the community.");
    $(".empty-state .button").classList.toggle("hidden", state.view === "feed" && Boolean(els.search.value.trim()));
    updateViewLabels();
  }

  function avatarTone(value) {
    const tones = ["", " avatar-lilac", " avatar-coral"];
    let hash = 0;
    for (const character of value) hash = (hash + character.charCodeAt(0)) % tones.length;
    return tones[hash];
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Community post";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }

  function updateViewLabels() {
    const mine = state.view === "mine";
    els.feedEyebrow.textContent = mine ? "YOUR CORNER OF THE COMMUNITY" : "A GOOD DAY TO SHARE";
    els.feedHeading.innerHTML = mine ? "Your <span>posts</span>" : "The community <span>board</span>";
    els.feedDescription.textContent = mine ? "Everything you’ve put out into the world." : "A little inspiration from people like you.";
    document.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle("active", active);
      if (button.getAttribute("role") === "tab") button.setAttribute("aria-selected", String(active));
    });
  }

  async function authenticate(event) {
    event.preventDefault();
    els.authError.textContent = "";
    const email = els.authEmail.value.trim();
    const password = els.authPassword.value;
    els.authSubmit.disabled = true;
    els.authSubmit.textContent = els.authForm.dataset.mode === "register" ? "Creating account…" : "Signing in…";
    try {
      if (els.authForm.dataset.mode === "register") {
        await api("/users/", { method: "POST", body: JSON.stringify({ email, password }) });
      }
      const credentials = new URLSearchParams({ username: email, password });
      const result = await api("/login", { method: "POST", body: credentials });
      state.token = result.token;
      state.email = email;
      localStorage.setItem("postmarkToken", result.token);
      localStorage.setItem("postmarkEmail", email);
      loadLikedIds();
      state.view = "feed";
      els.search.value = "";
      showApp();
      await loadFeed(true);
      if (els.appShell.classList.contains("hidden")) return;
      showToast(els.authForm.dataset.mode === "register" ? "Your account is ready. Welcome to Postmark!" : "Welcome back.");
      els.authPassword.value = "";
    } catch (error) {
      els.authError.textContent = error.message || "We couldn’t sign you in. Please try again.";
    } finally {
      els.authSubmit.disabled = false;
      updateAuthMode(els.authForm.dataset.mode === "register");
    }
  }

  function openEditor(post) {
    state.editingId = post ? post.id : null;
    els.postError.textContent = "";
    els.postForm.reset();
    els.postPublished.checked = true;
    els.dialogTitle.textContent = post ? "Edit your post" : "Write a post";
    els.dialogEyebrow.textContent = post ? "MAKE IT YOURS" : "PUT IT OUT THERE";
    els.postSubmit.innerHTML = post ? 'Save changes <span>↗</span>' : 'Publish post <span>↗</span>';
    if (post) {
      els.postTitle.value = post.title || "";
      els.postContent.value = post.content || "";
      els.postPublished.checked = Boolean(post.published);
    }
    els.postDialog.showModal();
    els.postTitle.focus();
  }

  async function savePost(event) {
    event.preventDefault();
    els.postError.textContent = "";
    const post = {
      title: els.postTitle.value.trim(),
      content: els.postContent.value.trim(),
      published: els.postPublished.checked
    };
    if (!post.title || !post.content) {
      els.postError.textContent = "Add both a title and some text before publishing.";
      return;
    }
    els.postSubmit.disabled = true;
    els.postSubmit.textContent = state.editingId ? "Saving…" : "Publishing…";
    try {
      const editingId = state.editingId;
      const saved = await api(editingId ? `/posts/${editingId}` : "/posts/", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(post)
      });
      els.postDialog.close();
      showToast(editingId ? "Your post was updated." : "Your post is out in the world.");
      await loadFeed(true);
      const matchesSearch = !els.search.value.trim()
        || String(saved.title || "").toLowerCase().includes(els.search.value.trim().toLowerCase());
      if (state.view === "feed" && matchesSearch && !state.posts.some((item) => String(item.post.id) === String(saved.id))) {
        state.posts.unshift({ post: saved, votes: editingId ? null : 0 });
        renderPosts();
      }
    } catch (error) {
      els.postError.textContent = error.message || "Your post couldn’t be saved.";
    } finally {
      els.postSubmit.disabled = false;
      els.postSubmit.innerHTML = state.editingId ? 'Save changes <span>↗</span>' : 'Publish post <span>↗</span>';
    }
  }

  async function deletePost(id) {
    if (!window.confirm("Delete this post? This can’t be undone.")) return;
    try {
      await api(`/posts/${id}`, { method: "DELETE" });
      state.likedIds.delete(Number(id));
      saveLikedIds();
      showToast("Post deleted.");
      await loadFeed(true);
    } catch (error) {
      showToast(error.message || "This post couldn’t be deleted.");
    }
  }

  async function toggleVote(button, id) {
    const postId = Number(id);
    const wasLiked = state.likedIds.has(postId);
    button.disabled = true;
    try {
      await api("/vote/", {
        method: "POST",
        body: JSON.stringify({ post_id: postId, dir: wasLiked ? 0 : 1 })
      });
      if (wasLiked) state.likedIds.delete(postId);
      else state.likedIds.add(postId);
      saveLikedIds();
      const entry = state.posts.find((item) => Number(item.post.id) === postId);
      if (entry && entry.votes !== null) entry.votes = Math.max(0, entry.votes + (wasLiked ? -1 : 1));
      else if (entry) entry.votes = wasLiked ? 0 : 1;
      renderPosts();
    } catch (error) {
      if (error.status === 409 && !wasLiked) {
        state.likedIds.add(postId);
        saveLikedIds();
        renderPosts();
        showToast("You’ve already liked this post. Your like is now marked on this device.");
      } else {
        showToast(error.message || "Your vote couldn’t be saved.");
      }
    } finally {
      button.disabled = false;
    }
  }

  function setView(view) {
    if (!["feed", "mine"].includes(view)) return;
    state.view = view;
    if (view === "mine") els.search.value = "";
    loadFeed(true);
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action], [data-view]");
    if (!target) return;
    if (target.dataset.view) {
      setView(target.dataset.view);
      return;
    }
    switch (target.dataset.action) {
      case "new-post":
        openEditor(null);
        break;
      case "close-dialog":
        els.postDialog.close();
        break;
      case "refresh":
        loadFeed(true);
        break;
      case "load-more":
        loadFeed(false);
        break;
      case "toggle-settings":
        els.settingsPopover.classList.toggle("hidden");
        break;
      case "save-api-url":
        if (setApiUrl(target.closest(".api-config-row").querySelector("input").value)) {
          const details = target.closest("details");
          if (details) details.open = false;
          els.settingsPopover.classList.add("hidden");
          if (state.token) loadFeed(true);
        }
        break;
      case "logout":
        clearSession();
        showAuth();
        updateAuthMode(false);
        showToast("You’ve signed out.");
        break;
      case "edit-post": {
        const item = state.posts.find((entry) => String(entry.post.id) === target.dataset.id);
        if (item) openEditor(item.post);
        break;
      }
      case "delete-post":
        deletePost(target.dataset.id);
        break;
      case "vote": {
        const id = target.dataset.id;
        toggleVote(target, id);
        break;
      }
      case "read-more": {
        const content = target.previousElementSibling;
        const collapsed = content.classList.toggle("collapsed");
        target.textContent = collapsed ? "Read more" : "Show less";
        break;
      }
    }
  });

  els.authForm.addEventListener("submit", authenticate);
  els.authSwitch.addEventListener("click", () => {
    els.authError.textContent = "";
    updateAuthMode(els.authForm.dataset.mode !== "register");
  });
  els.postForm.addEventListener("submit", savePost);
  els.search.addEventListener("input", () => {
    if (state.view !== "feed") setView("feed");
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => loadFeed(true), 280);
  });
  els.search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      els.search.value = "";
      loadFeed(true);
      els.search.blur();
    }
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      els.search.focus();
    }
  });
  els.postDialog.addEventListener("click", (event) => {
    if (event.target === els.postDialog) els.postDialog.close();
  });

  els.authApiUrl.value = state.apiUrl;
  els.appApiUrl.value = state.apiUrl;
  updateAuthMode(false);
  if (state.token) {
    loadLikedIds();
    showApp();
    loadFeed(true);
  } else {
    showAuth();
  }
})();
