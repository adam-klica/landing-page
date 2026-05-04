// Dashboard JS for Next.js - Updated to use Next.js API routes

// ----------------- Users by City -----------------
async function loadUsersByCity() {
  try {
    const res = await fetch("/api/dashboard/users-by-city");
    const data = await res.json();
    if (!data || !data.length) return;

    const labels = data.map((item) => item.city);
    const values = data.map((item) => parseInt(item.total));

    const ctx = document.getElementById("usersByCity");
    if (!ctx || typeof window.Chart === "undefined") return;

    new window.Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Users",
            data: values,
            backgroundColor: "rgba(0, 95, 153, 0.6)",
            borderColor: "rgba(0, 95, 153, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Users by City" },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  } catch (err) {
    console.error("Error loading users by city:", err);
  }
}

// ----------------- Users by Region -----------------
async function loadUsersByRegion() {
  try {
    const res = await fetch("/api/dashboard/users-by-region");
    const data = await res.json();
    if (!data || !data.length) return;

    const labels = data.map((item) => item.region);
    const values = data.map((item) => parseInt(item.total));

    const ctx = document.getElementById("usersByRegion");
    if (!ctx || typeof window.Chart === "undefined") return;

    new window.Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Users",
            data: values,
            backgroundColor: "rgba(0, 153, 76, 0.6)",
            borderColor: "rgba(0, 153, 76, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Users by Region" },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  } catch (err) {
    console.error("Error loading users by region:", err);
  }
}

// ----------------- Users by Country -----------------
async function loadUsersByCountry() {
  try {
    const res = await fetch("/api/dashboard/users-by-country");
    const data = await res.json();
    if (!data || !data.length) return;

    const labels = data.map((item) => item.country);
    const values = data.map((item) => parseInt(item.total));

    const ctx = document.getElementById("usersByCountry");
    if (!ctx || typeof window.Chart === "undefined") return;

    new window.Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Users",
            data: values,
            backgroundColor: "rgba(255, 165, 0, 0.6)",
            borderColor: "rgba(255, 165, 0, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Users by Country" },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  } catch (err) {
    console.error("Error loading users by country:", err);
  }
}

// ----------------- Visitors -----------------
async function loadVisitors() {
  try {
    const res = await fetch("/api/dashboard/visitors");
    const data = await res.json();

    const todayEl = document.getElementById("visitors-today");
    const totalEl = document.getElementById("visitors-total");
    if (todayEl) todayEl.textContent = data.today || "0";
    if (totalEl) totalEl.textContent = data.total || "0";
  } catch (err) {
    console.error("Error loading visitors:", err);
  }
}

// ----------------- Interests -----------------
async function loadInterests() {
  try {
    const res = await fetch("/api/dashboard/users-interests");
    const data = await res.json();

    if (!data || !data.length) {
      const el = document.getElementById("interests-cloud");
      if (el) el.outerHTML = "<p>No interests found</p>";
      return;
    }

    const ctx = document.getElementById("interests-cloud");
    if (!ctx || typeof window.Chart === "undefined") return;

    new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map((item) => item.interest),
        datasets: [
          {
            label: "Number of Users",
            data: data.map((item) => item.count),
            backgroundColor: "#0077cc",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  } catch (err) {
    console.error("Error loading interests:", err);
  }
}

// ----------------- News -----------------
function trimText(text: string, maxLength: number) {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

async function loadNews() {
  try {
    const res = await fetch("/api/posts?type=news&status=published&limit=3");
    const data = await res.json();
    const posts = data.posts || [];

    const list = document.getElementById("news-list");
    if (!list) return;

    list.innerHTML = "";

    if (!posts.length) {
      list.innerHTML = "<li>No news available.</li>";
      return;
    }

    posts.forEach((post: any) => {
      const li = document.createElement("li");
      const excerpt = post.excerpt || "";
      const shortExcerpt = trimText(excerpt, 120);
      const date = post.publishedAt || post.createdAt;

      li.innerHTML = `
        <a href="/news/${post.slug}" target="_blank">${post.title}</a>
        <p class="news-excerpt">${shortExcerpt}</p>
        <span class="news-date">${date ? new Date(date).toLocaleDateString() : ""}</span>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading news:", err);
  }
}

// ----------------- Documents (Resources) -----------------
async function loadDocuments() {
  try {
    const res = await fetch("/api/posts?type=resource&status=published&limit=5");
    const data = await res.json();
    const docs = data.posts || [];

    const list = document.getElementById("docs-list");
    if (!list) return;

    list.innerHTML = "";

    if (!docs.length) {
      list.innerHTML = "<li>No documents available.</li>";
      return;
    }

    docs.forEach((doc: any) => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="/resources/${doc.slug}">📄 ${doc.title}</a>`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading documents", err);
  }
}

// ----------------- Init -----------------
document.addEventListener("DOMContentLoaded", () => {
  // Wait for Chart.js to load
  if (typeof window.Chart === "undefined") {
    const checkChart = setInterval(() => {
      if (typeof window.Chart !== "undefined") {
        clearInterval(checkChart);
        initDashboard();
      }
    }, 100);
  } else {
    initDashboard();
  }
});

function initDashboard() {
  loadUsersByCity();
  loadUsersByRegion();
  loadUsersByCountry();
  loadVisitors();
  loadInterests();
  loadNews();
  loadDocuments();
}
