/* ============================================================
   ফলহাট — app.js
   ক্রেতা ও বিক্রেতা (এডমিন) — দুই ভিউয়ের সম্পূর্ণ লজিক
   ============================================================ */
(() => {
  "use strict";

  const ADMIN_PASSWORD = "USTisha99";

  const FRUIT_OPTIONS = ["আম", "লিচু", "কাঁঠাল", "পেয়ারা", "কুল/বরই", "আমড়া", "বেল", "তরমুজ", "কমলা/মাল্টা", "অন্যান্য"];
  const FRUIT_EMOJI = {
    "আম": "🥭", "লিচু": "🍓", "কাঁঠাল": "🍈", "পেয়ারা": "🍐",
    "কুল/বরই": "🍒", "আমড়া": "🟢", "বেল": "🟠", "তরমুজ": "🍉",
    "কমলা/মাল্টা": "🍊", "অন্যান্য": "🧺"
  };
  const UNIT_OPTIONS = ["কেজি", "ডজন", "মণ", "পিস", "ক্যারেট"];

  /* ---------------- DOM refs ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const buyerView = $("#buyerView");
  const sellerView = $("#sellerView");
  const postsGrid = $("#postsGrid");
  const emptyState = $("#emptyState");
  const sellerPostsList = $("#sellerPostsList");
  const sellerEmptyState = $("#sellerEmptyState");
  const activeCountEl = $("#activeCount");

  const adminTrigger = $("#adminTrigger");
  const adminModal = $("#adminPasswordModal");
  const adminForm = $("#adminPasswordForm");
  const adminInput = $("#adminPasswordInput");
  const adminError = $("#adminPasswordError");
  const adminCancelBtn = $("#adminCancelBtn");

  const logoutBtn = $("#logoutBtn");
  const backToBuyerBtn = $("#backToBuyerBtn");
  const newPostFab = $("#newPostFab");

  const newPostModal = $("#newPostModal");
  const newPostForm = $("#newPostForm");
  const newPostCloseBtn = $("#newPostCloseBtn");
  const fruitTypeSelect = $("#fruitTypeSelect");
  const customFruitField = $("#customFruitField");
  const customFruitInput = $("#customFruitInput");
  const newPostTitle = $("#newPostTitle");

  const detailModal = $("#postDetailModal");
  const detailCloseBtn = $("#detailCloseBtn");
  const detailBody = $("#detailBody");

  const toastEl = $("#toast");

  /* ---------------- state ---------------- */
  let allPosts = [];
  let unsubPosts = null;
  let detailUnsubs = [];
  let editingPostId = null;
  let commentRatingValue = 0;
  const sellerExpandedSet = new Set();
  const cardRatingUnsubs = {};   // postId -> unsub  (buyer grid rating badge)
  const sellerCountUnsubs = {};  // postId -> [unsub, unsub] (order/comment counts)
  const sellerExpandDetailUnsubs = {}; // postId -> [unsub, unsub] (full orders/comments list)

  /* ---------------- helpers ---------------- */
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  function fmtMoney(n) {
    return "৳" + Number(n).toLocaleString("bn-BD");
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" }) +
      ", " + d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function staticStars(rating) {
    const r = Math.round(rating || 0);
    let html = '<span class="stars static">';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star${i <= r ? " filled" : ""}">★</span>`;
    }
    html += "</span>";
    return html;
  }

  /* ---------------- view switching ---------------- */
  function isSeller() {
    return sessionStorage.getItem("folhaat_admin") === "1";
  }

  function showBuyerView() {
    buyerView.hidden = false;
    sellerView.hidden = true;
  }

  function showSellerView() {
    buyerView.hidden = true;
    sellerView.hidden = false;
    renderSellerPosts();
  }

  /* ---------------- Firestore: posts listener ---------------- */
  function startPostsListener() {
    unsubPosts = db.collection("posts").orderBy("createdAt", "desc")
      .onSnapshot((snap) => {
        allPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderBuyerPosts();
        if (!sellerView.hidden) renderSellerPosts();
      }, (err) => {
        console.error(err);
        showToast("ডেটা লোড করতে সমস্যা হচ্ছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
      });
  }

  /* ---------------- Buyer: render grid ---------------- */
  function renderBuyerPosts() {
    postsGrid.innerHTML = "";
    const active = allPosts.filter((p) => p.status !== "closed");
    const closed = allPosts.filter((p) => p.status === "closed");
    const ordered = [...active, ...closed];

    activeCountEl.textContent = active.length;
    emptyState.hidden = allPosts.length > 0;

    ordered.forEach((post) => {
      postsGrid.appendChild(buildBuyerCard(post));
    });
  }

  function buildBuyerCard(post) {
    const card = document.createElement("div");
    card.className = "tag-card" + (post.status === "closed" ? " closed" : "");
    const emoji = FRUIT_EMOJI[post.fruitType] || "🧺";
    const title = post.fruitType === "অন্যান্য" && post.customFruitType ? post.customFruitType : post.fruitType;

    card.innerHTML = `
      <span class="tag-stamp${post.status === "closed" ? " sold" : ""}">${post.status === "closed" ? "শেষ" : "তাজা"}</span>
      <div class="tag-top">
        <span class="tag-emoji">${emoji}</span>
        <div>
          <div class="tag-title">${escapeHtml(title)}</div>
          <div class="tag-source">${escapeHtml(post.source || "উৎস উল্লেখ নেই")}</div>
        </div>
      </div>
      <div class="tag-rows">
        <span class="row">পরিমাণ: <b>${escapeHtml(post.quantityAvailable)} ${escapeHtml(post.unit)}</b></span>
        <span class="row">প্রাপ্তি: <b>${escapeHtml(post.availableTime || "—")}</b></span>
      </div>
      <div class="tag-price">
        <span class="amount">${fmtMoney(post.pricePerUnit)}<span> /${escapeHtml(post.unit)}</span></span>
        <span class="tag-rating" data-rating-slot></span>
      </div>
    `;
    card.addEventListener("click", () => openPostDetail(post.id));

    // attach a light listener just for rating summary on the card
    // (unsubscribe any previous listener for this post first to avoid leaks
    // since the whole grid is rebuilt on every posts-collection change)
    if (cardRatingUnsubs[post.id]) cardRatingUnsubs[post.id]();
    cardRatingUnsubs[post.id] = db.collection("posts").doc(post.id).collection("comments")
      .onSnapshot((snap) => {
        const slot = card.querySelector("[data-rating-slot]");
        if (!slot) return;
        if (snap.empty) { slot.textContent = "নতুন পোস্ট"; return; }
        const ratings = snap.docs.map((d) => d.data().rating || 0);
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        slot.innerHTML = `★ ${avg.toFixed(1)} <span class="count">(${ratings.length})</span>`;
      });

    return card;
  }

  /* ---------------- Post detail modal (buyer) ---------------- */
  function openPostDetail(postId) {
    const post = allPosts.find((p) => p.id === postId);
    if (!post) return;
    commentRatingValue = 0;
    detachDetailListeners();

    const emoji = FRUIT_EMOJI[post.fruitType] || "🧺";
    const title = post.fruitType === "অন্যান্য" && post.customFruitType ? post.customFruitType : post.fruitType;

    detailBody.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:2rem;">${emoji}</span>
        <div>
          <h2 style="font-size:1.3rem;">${escapeHtml(title)}</h2>
          <span class="stock-pill" data-stock-pill>লোড হচ্ছে...</span>
        </div>
      </div>
      <div class="detail-rows">
        <div class="row"><span>মূল্য</span><span>${fmtMoney(post.pricePerUnit)} / ${escapeHtml(post.unit)}</span></div>
        <div class="row"><span>মোট আনা হয়েছে</span><span>${escapeHtml(post.quantityAvailable)} ${escapeHtml(post.unit)}</span></div>
        <div class="row"><span>উৎস</span><span>${escapeHtml(post.source || "—")}</span></div>
        <div class="row"><span>প্রাপ্তির সময়</span><span>${escapeHtml(post.availableTime || "—")}</span></div>
        ${post.notes ? `<div class="row"><span>মন্তব্য</span><span>${escapeHtml(post.notes)}</span></div>` : ""}
      </div>

      <hr class="dash" />

      <div id="orderSection">
        ${post.status === "closed" ? `
          <p style="color:var(--ink-soft);font-size:.9rem;">এই পোস্টে আর অর্ডার নেওয়া হচ্ছে না। বিক্রেতার সাথে সরাসরি যোগাযোগ করুন।</p>
        ` : `
          <h3 style="font-size:1.05rem;margin-bottom:10px;">পরিমাণ অর্ডার করুন</h3>
          <form id="orderForm">
            <div class="field-row">
              <div class="field"><label>আপনার নাম</label><input required name="name" placeholder="যেমন: রিনা আক্তার" /></div>
              <div class="field"><label>মোবাইল নম্বর</label><input required name="phone" placeholder="01XXXXXXXXX" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label>পরিমাণ (${escapeHtml(post.unit)})</label><input required type="number" min="0.5" step="0.5" name="quantity" placeholder="যেমন: ২" /></div>
              <div class="field"><label>নোট (ঐচ্ছিক)</label><input name="note" placeholder="যেমন: বাসায় পৌঁছে দিতে হবে" /></div>
            </div>
            <p class="error-text" id="orderError"></p>
            <button type="submit" class="btn btn-primary btn-block">অর্ডার করুন</button>
          </form>
        `}
      </div>

      <hr class="dash" />

      <h3 style="font-size:1.05rem;margin-bottom:10px;">মন্তব্য ও রেটিং দিন</h3>
      <form id="commentForm">
        <div class="field"><label>আপনার নাম</label><input required name="name" placeholder="আপনার নাম লিখুন" /></div>
        <div class="field">
          <label>রেটিং</label>
          <div class="stars" id="ratingStars">
            ${[1,2,3,4,5].map(i=>`<span class="star" data-val="${i}">★</span>`).join("")}
          </div>
        </div>
        <div class="field"><label>মন্তব্য</label><textarea required name="comment" placeholder="ফল কেমন ছিল লিখুন..."></textarea></div>
        <p class="error-text" id="commentError"></p>
        <button type="submit" class="btn btn-leaf btn-block">মন্তব্য পাঠান</button>
      </form>

      <hr class="dash" />
      <h3 style="font-size:1.05rem;margin-bottom:6px;">সবার মন্তব্য</h3>
      <div id="commentsList"><p style="color:var(--ink-soft);font-size:.88rem;">লোড হচ্ছে...</p></div>
    `;

    detailModal.hidden = false;

    // star input behaviour
    const starWrap = $("#ratingStars");
    starWrap.querySelectorAll(".star").forEach((star) => {
      star.addEventListener("click", () => {
        commentRatingValue = Number(star.dataset.val);
        starWrap.querySelectorAll(".star").forEach((s) => {
          s.classList.toggle("filled", Number(s.dataset.val) <= commentRatingValue);
        });
      });
    });

    // orders listener -> remaining stock
    const unsubOrders = db.collection("posts").doc(postId).collection("orders")
      .onSnapshot((snap) => {
        const totalOrdered = snap.docs.reduce((sum, d) => sum + (Number(d.data().quantity) || 0), 0);
        const remaining = Number(post.quantityAvailable) - totalOrdered;
        const pill = $("[data-stock-pill]");
        if (pill) {
          if (post.status === "closed") {
            pill.textContent = "অর্ডার বন্ধ";
            pill.classList.add("low");
          } else if (remaining <= 0) {
            pill.textContent = "স্টক প্রায় শেষ";
            pill.classList.add("low");
          } else {
            pill.textContent = `অবশিষ্ট আছে: ${remaining} ${post.unit}`;
            pill.classList.remove("low");
          }
        }
      });
    detailUnsubs.push(unsubOrders);

    // comments listener
    const unsubComments = db.collection("posts").doc(postId).collection("comments")
      .orderBy("createdAt", "desc")
      .onSnapshot((snap) => {
        const listEl = $("#commentsList");
        if (!listEl) return;
        if (snap.empty) {
          listEl.innerHTML = `<p style="color:var(--ink-soft);font-size:.88rem;">এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্যটি আপনিই করুন!</p>`;
          return;
        }
        listEl.innerHTML = snap.docs.map((d) => {
          const c = d.data();
          return `
            <div class="comment-row">
              <div class="name">${escapeHtml(c.name)} ${staticStars(c.rating)}</div>
              <div class="sub">${fmtDate(c.createdAt)}</div>
              <p style="margin:6px 0 0;font-size:.92rem;">${escapeHtml(c.comment)}</p>
              ${c.reply ? `<div class="reply-box existing">🥭 <b>বিক্রেতার উত্তর:</b> ${escapeHtml(c.reply)}</div>` : ""}
            </div>
          `;
        }).join("");
      });
    detailUnsubs.push(unsubComments);

    // order form submit
    const orderForm = $("#orderForm");
    if (orderForm) {
      orderForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(orderForm);
        const qty = Number(fd.get("quantity"));
        const errorEl = $("#orderError");
        if (!fd.get("name") || !fd.get("phone") || !qty || qty <= 0) {
          errorEl.textContent = "নাম, মোবাইল নম্বর ও পরিমাণ ঠিকভাবে দিন।";
          errorEl.classList.add("show");
          return;
        }
        errorEl.classList.remove("show");
        const btn = orderForm.querySelector("button[type=submit]");
        btn.disabled = true;
        db.collection("posts").doc(postId).collection("orders").add({
          name: fd.get("name").trim(),
          phone: fd.get("phone").trim(),
          quantity: qty,
          note: (fd.get("note") || "").trim(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          showToast("অর্ডার রেকর্ড করা হয়েছে! বিক্রেতা শীঘ্রই যোগাযোগ করবেন।");
          orderForm.reset();
        }).catch((err) => {
          console.error(err);
          errorEl.textContent = "অর্ডার পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।";
          errorEl.classList.add("show");
        }).finally(() => { btn.disabled = false; });
      });
    }

    // comment form submit
    const commentForm = $("#commentForm");
    commentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(commentForm);
      const errorEl = $("#commentError");
      if (!fd.get("name") || !fd.get("comment") || commentRatingValue === 0) {
        errorEl.textContent = "নাম, রেটিং ও মন্তব্য সবগুলো দিন।";
        errorEl.classList.add("show");
        return;
      }
      errorEl.classList.remove("show");
      const btn = commentForm.querySelector("button[type=submit]");
      btn.disabled = true;
      db.collection("posts").doc(postId).collection("comments").add({
        name: fd.get("name").trim(),
        rating: commentRatingValue,
        comment: fd.get("comment").trim(),
        reply: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        showToast("আপনার মন্তব্য জমা হয়েছে। ধন্যবাদ!");
        commentForm.reset();
        commentRatingValue = 0;
        starWrap.querySelectorAll(".star").forEach((s) => s.classList.remove("filled"));
      }).catch((err) => {
        console.error(err);
        errorEl.textContent = "মন্তব্য পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।";
        errorEl.classList.add("show");
      }).finally(() => { btn.disabled = false; });
    });
  }

  function detachDetailListeners() {
    detailUnsubs.forEach((fn) => fn && fn());
    detailUnsubs = [];
  }

  function closeDetailModal() {
    detailModal.hidden = true;
    detachDetailListeners();
  }

  /* ---------------- Admin login ---------------- */
  function openAdminModal() {
    adminError.classList.remove("show");
    adminInput.value = "";
    adminModal.hidden = false;
    setTimeout(() => adminInput.focus(), 80);
  }
  function closeAdminModal() { adminModal.hidden = true; }

  adminTrigger.addEventListener("click", openAdminModal);
  adminCancelBtn.addEventListener("click", closeAdminModal);
  adminForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (adminInput.value === ADMIN_PASSWORD) {
      sessionStorage.setItem("folhaat_admin", "1");
      closeAdminModal();
      showSellerView();
      showToast("বিক্রেতা প্যানেলে স্বাগতম!");
    } else {
      adminError.textContent = "পাসওয়ার্ড ভুল হয়েছে।";
      adminError.classList.add("show");
      const card = adminModal.querySelector(".modal-card");
      card.style.animation = "none";
      requestAnimationFrame(() => { card.style.animation = ""; });
    }
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("folhaat_admin");
    showBuyerView();
    showToast("লগআউট হয়েছে।");
  });
  backToBuyerBtn.addEventListener("click", showBuyerView);

  /* ---------------- New / edit post modal ---------------- */
  function populateFruitSelect() {
    fruitTypeSelect.innerHTML = FRUIT_OPTIONS.map((f) => `<option value="${f}">${f}</option>`).join("");
  }
  function populateUnitSelect() {
    const unitSelect = $("#unitSelect");
    unitSelect.innerHTML = UNIT_OPTIONS.map((u) => `<option value="${u}">${u}</option>`).join("");
  }
  populateFruitSelect();
  populateUnitSelect();

  fruitTypeSelect.addEventListener("change", () => {
    customFruitField.hidden = fruitTypeSelect.value !== "অন্যান্য";
  });

  function openNewPostModal(post) {
    newPostForm.reset();
    customFruitField.hidden = true;
    editingPostId = post ? post.id : null;
    newPostTitle.textContent = post ? "পোস্ট সম্পাদনা করুন" : "নতুন পোস্ট তৈরি করুন";
    if (post) {
      fruitTypeSelect.value = post.fruitType;
      if (post.fruitType === "অন্যান্য") {
        customFruitField.hidden = false;
        customFruitInput.value = post.customFruitType || "";
      }
      newPostForm.quantityAvailable.value = post.quantityAvailable;
      newPostForm.unit.value = post.unit;
      newPostForm.pricePerUnit.value = post.pricePerUnit;
      newPostForm.source.value = post.source || "";
      newPostForm.availableTime.value = post.availableTime || "";
      newPostForm.notes.value = post.notes || "";
    }
    newPostModal.hidden = false;
  }
  function closeNewPostModal() { newPostModal.hidden = true; editingPostId = null; }

  newPostFab.addEventListener("click", () => openNewPostModal(null));
  newPostCloseBtn.addEventListener("click", closeNewPostModal);

  newPostForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(newPostForm);
    const fruitType = fd.get("fruitType");
    const data = {
      fruitType,
      customFruitType: fruitType === "অন্যান্য" ? (fd.get("customFruitType") || "").trim() : "",
      quantityAvailable: Number(fd.get("quantityAvailable")),
      unit: fd.get("unit"),
      pricePerUnit: Number(fd.get("pricePerUnit")),
      source: (fd.get("source") || "").trim(),
      availableTime: (fd.get("availableTime") || "").trim(),
      notes: (fd.get("notes") || "").trim()
    };
    if (!data.quantityAvailable || !data.pricePerUnit) {
      showToast("পরিমাণ ও মূল্য ঠিকভাবে দিন।");
      return;
    }
    const btn = newPostForm.querySelector("button[type=submit]");
    btn.disabled = true;

    const action = editingPostId
      ? db.collection("posts").doc(editingPostId).update(data)
      : db.collection("posts").add({ ...data, status: "active", createdAt: firebase.firestore.FieldValue.serverTimestamp() });

    action.then(() => {
      showToast(editingPostId ? "পোস্ট আপডেট হয়েছে।" : "নতুন পোস্ট প্রকাশ হয়েছে!");
      closeNewPostModal();
    }).catch((err) => {
      console.error(err);
      showToast("সংরক্ষণ করতে সমস্যা হয়েছে।");
    }).finally(() => { btn.disabled = false; });
  });

  /* ---------------- Seller view: render ---------------- */
  function renderSellerPosts() {
    sellerPostsList.innerHTML = "";
    sellerEmptyState.hidden = allPosts.length > 0;
    allPosts.forEach((post) => sellerPostsList.appendChild(buildSellerCard(post)));
  }

  function buildSellerCard(post) {
    const card = document.createElement("div");
    card.className = "seller-card";
    const emoji = FRUIT_EMOJI[post.fruitType] || "🧺";
    const title = post.fruitType === "অন্যান্য" && post.customFruitType ? post.customFruitType : post.fruitType;
    const expanded = sellerExpandedSet.has(post.id);

    card.innerHTML = `
      <div class="top">
        <div>
          <div class="tag-title">${emoji} ${escapeHtml(title)}</div>
          <div class="meta">${escapeHtml(post.quantityAvailable)} ${escapeHtml(post.unit)} • ${fmtMoney(post.pricePerUnit)}/${escapeHtml(post.unit)} • ${escapeHtml(post.status === "closed" ? "বন্ধ" : "চালু")}</div>
        </div>
      </div>
      <div class="stats">
        <span>অর্ডার: <b data-order-count>...</b></span>
        <span>মন্তব্য: <b data-comment-count>...</b></span>
      </div>
      <div class="actions">
        <button class="btn btn-ghost btn-sm" data-action="expand">${expanded ? "বিস্তারিত বন্ধ করুন" : "অর্ডার ও মন্তব্য দেখুন"}</button>
        <button class="btn btn-ghost btn-sm" data-action="edit">সম্পাদনা</button>
        <button class="btn btn-ghost btn-sm" data-action="toggle-status">${post.status === "closed" ? "আবার চালু করুন" : "অর্ডার বন্ধ করুন"}</button>
        <button class="btn btn-danger btn-sm" data-action="delete">মুছে ফেলুন</button>
      </div>
      <div class="expand" data-expand-zone ${expanded ? "" : 'style="display:none;"'}>
        <div data-orders-zone style="margin-bottom:10px;"></div>
        <div data-comments-zone></div>
      </div>
    `;

    card.querySelector('[data-action="edit"]').addEventListener("click", () => openNewPostModal(post));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => {
      if (confirm(`"${title}" পোস্টটি মুছে ফেলতে চান? এটি পূর্বাবস্থায় ফেরানো যাবে না।`)) {
        teardownSellerExpand(post.id);
        sellerExpandedSet.delete(post.id);
        db.collection("posts").doc(post.id).delete().then(() => showToast("পোস্ট মুছে ফেলা হয়েছে।"));
      }
    });
    card.querySelector('[data-action="toggle-status"]').addEventListener("click", () => {
      db.collection("posts").doc(post.id).update({ status: post.status === "closed" ? "active" : "closed" });
    });
    card.querySelector('[data-action="expand"]').addEventListener("click", (e) => {
      const zone = card.querySelector("[data-expand-zone]");
      const willExpand = zone.style.display === "none";
      zone.style.display = willExpand ? "" : "none";
      e.target.textContent = willExpand ? "বিস্তারিত বন্ধ করুন" : "অর্ডার ও মন্তব্য দেখুন";
      if (willExpand) {
        sellerExpandedSet.add(post.id);
        setupSellerExpand(post, card);
      } else {
        sellerExpandedSet.delete(post.id);
        teardownSellerExpand(post.id);
      }
    });

    // always show live counts (cheap subcollection listeners) — unsubscribe
    // any previous pair for this post first since the card is rebuilt on
    // every posts-collection change
    if (sellerCountUnsubs[post.id]) sellerCountUnsubs[post.id].forEach((fn) => fn && fn());
    const unsubO = db.collection("posts").doc(post.id).collection("orders").onSnapshot((snap) => {
      const el = card.querySelector("[data-order-count]");
      if (el) el.textContent = snap.size;
    });
    const unsubC = db.collection("posts").doc(post.id).collection("comments").onSnapshot((snap) => {
      const el = card.querySelector("[data-comment-count]");
      if (el) el.textContent = snap.size;
    });
    sellerCountUnsubs[post.id] = [unsubO, unsubC];

    if (expanded) setupSellerExpand(post, card);

    return card;
  }

  function teardownSellerExpand(postId) {
    if (sellerExpandDetailUnsubs[postId]) {
      sellerExpandDetailUnsubs[postId].forEach((fn) => fn && fn());
      delete sellerExpandDetailUnsubs[postId];
    }
  }

  function setupSellerExpand(post, card) {
    const ordersZone = card.querySelector("[data-orders-zone]");
    const commentsZone = card.querySelector("[data-comments-zone]");

    // unsubscribe any previous detail listeners for this post (e.g. bound to
    // an older card instance) before attaching fresh ones to the new card
    teardownSellerExpand(post.id);

    const unsubOrders = db.collection("posts").doc(post.id).collection("orders").orderBy("createdAt", "desc")
      .onSnapshot((snap) => {
        if (snap.empty) {
          ordersZone.innerHTML = `<p style="color:var(--ink-soft);font-size:.85rem;">এখনো কোনো অর্ডার আসেনি।</p>`;
          return;
        }
        const totalQty = snap.docs.reduce((s, d) => s + (Number(d.data().quantity) || 0), 0);
        ordersZone.innerHTML = `<p style="font-size:.85rem;color:var(--leaf);font-weight:700;margin:0 0 6px;">মোট অর্ডার হয়েছে: ${totalQty} ${escapeHtml(post.unit)}</p>` +
          snap.docs.map((d) => {
            const o = d.data();
            return `
              <div class="order-row">
                <div class="name">${escapeHtml(o.name)} — ${escapeHtml(o.quantity)} ${escapeHtml(post.unit)}</div>
                <div class="sub">📞 ${escapeHtml(o.phone)} ${o.note ? "• " + escapeHtml(o.note) : ""} • ${fmtDate(o.createdAt)}</div>
              </div>
            `;
          }).join("");
      });

    const unsubComments = db.collection("posts").doc(post.id).collection("comments").orderBy("createdAt", "desc")
      .onSnapshot((snap) => {
        if (snap.empty) {
          commentsZone.innerHTML = `<p style="color:var(--ink-soft);font-size:.85rem;">এখনো কোনো মন্তব্য নেই।</p>`;
          return;
        }
        commentsZone.innerHTML = snap.docs.map((d) => {
          const c = d.data();
          return `
            <div class="comment-row">
              <div class="name">${escapeHtml(c.name)} ${staticStars(c.rating)}</div>
              <div class="sub">${fmtDate(c.createdAt)}</div>
              <p style="margin:6px 0 0;font-size:.9rem;">${escapeHtml(c.comment)}</p>
              ${c.reply
                ? `<div class="reply-box existing">🥭 <b>আপনার উত্তর:</b> ${escapeHtml(c.reply)}</div>`
                : `<div class="reply-form" data-reply-form data-comment-id="${d.id}">
                     <input type="text" placeholder="উত্তর লিখুন..." />
                     <button class="btn btn-leaf btn-sm" type="button">পাঠান</button>
                   </div>`}
            </div>
          `;
        }).join("");

        commentsZone.querySelectorAll("[data-reply-form]").forEach((form) => {
          const input = form.querySelector("input");
          const btn = form.querySelector("button");
          btn.addEventListener("click", () => {
            const text = input.value.trim();
            if (!text) return;
            btn.disabled = true;
            db.collection("posts").doc(post.id).collection("comments").doc(form.dataset.commentId)
              .update({ reply: text, repliedAt: firebase.firestore.FieldValue.serverTimestamp() })
              .then(() => showToast("উত্তর পাঠানো হয়েছে।"))
              .catch(() => showToast("উত্তর পাঠাতে সমস্যা হয়েছে।"))
              .finally(() => { btn.disabled = false; });
          });
        });
      });

    sellerExpandDetailUnsubs[post.id] = [unsubOrders, unsubComments];
  }

  /* ---------------- Modal close wiring ---------------- */
  detailCloseBtn.addEventListener("click", closeDetailModal);
  detailModal.addEventListener("click", (e) => { if (e.target === detailModal) closeDetailModal(); });
  adminModal.addEventListener("click", (e) => { if (e.target === adminModal) closeAdminModal(); });
  newPostModal.addEventListener("click", (e) => { if (e.target === newPostModal) closeNewPostModal(); });

  /* ---------------- init ---------------- */
  function init() {
    if (isSeller()) {
      showSellerView();
    } else {
      showBuyerView();
    }
    startPostsListener();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("SW registration failed", err));
      });
    }
  }

  init();
})();
