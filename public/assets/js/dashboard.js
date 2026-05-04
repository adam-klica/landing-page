jQuery(document).ready(function ($) {

  // ----------------- Users by City -----------------
  $.get('/wp-json/landing/users-by-city', function (data) {
    if (!data || !data.length) return;

    const labels = data.map(item => item.city);
    const values = data.map(item => parseInt(item.total));

    const ctx = document.getElementById('usersByCity').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Users', data: values, backgroundColor: 'rgba(0, 95, 153, 0.6)', borderColor: 'rgba(0, 95, 153, 1)', borderWidth: 1 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Users by City' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  });

  // ----------------- Users by Region -----------------
  $.get('/wp-json/landing/users-by-region', function (data) {
    if (!data || !data.length) return;

    const labels = data.map(item => item.region);
    const values = data.map(item => parseInt(item.total));

    const ctx = document.getElementById('usersByRegion').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Users', data: values, backgroundColor: 'rgba(0, 153, 76, 0.6)', borderColor: 'rgba(0, 153, 76, 1)', borderWidth: 1 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Users by Region' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  });

  // ----------------- Users by Country -----------------
  $.get('/wp-json/landing/users-by-country', function (data) {
    if (!data || !data.length) return;

    const labels = data.map(item => item.country);
    const values = data.map(item => parseInt(item.total));

    const ctx = document.getElementById('usersByCountry').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Users', data: values, backgroundColor: 'rgba(255, 165, 0, 0.6)', borderColor: 'rgba(255, 165, 0, 1)', borderWidth: 1 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Users by Country' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  });

}); // end jQuery ready


// ----------------- Visitors -----------------
async function loadVisitors() {
  try {
    const res = await fetch('/wp-json/bluegrowth/v1/visitors');
    const data = await res.json();

    document.getElementById('visitors-today').textContent = data.today;
    document.getElementById('visitors-total').textContent = data.total;
  } catch (err) {
    console.error("Error loading visitors:", err);
  }
}


// ----------------- Interests -----------------
async function loadInterests() {
  try {
    const res = await fetch('/wp-json/bluegrowth/v1/users-interests');
    const data = await res.json();

    if (!data || !data.length) {
      document.getElementById('interests-cloud').outerHTML = "<p>No interests found</p>";
      return;
    }

    const ctx = document.getElementById('interests-cloud').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: { labels: data.map(item => item.interest), datasets: [{ label: 'Number of Users', data: data.map(item => item.count), backgroundColor: '#0077cc' }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  } catch (err) {
    console.error("Error loading interests:", err);
  }
}


// ----------------- News -----------------
function trimText(text, maxLength) {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

async function loadNews() {
  try {
    const res = await fetch('/wp-json/wp/v2/posts?per_page=3');
    const posts = await res.json();

    const list = document.getElementById('news-list');
    list.innerHTML = '';

    if (!posts.length) {
      list.innerHTML = '<li>No news available.</li>';
      return;
    }

    posts.forEach(post => {
      const li = document.createElement('li');
      const excerpt = post.excerpt.rendered.replace(/<[^>]+>/g, '');
      const shortExcerpt = trimText(excerpt, 120);

      li.innerHTML = `
        <a href="${post.link}" target="_blank">${post.title.rendered}</a>
        <p class="news-excerpt">${shortExcerpt}</p>
        <span class="news-date">${new Date(post.date).toLocaleDateString()}</span>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading news:", err);
  }
}


// ----------------- Documents -----------------
async function loadDocuments() {
  try {
    const res = await fetch('/wp-json/wp/v2/documents?per_page=5');
    const docs = await res.json();

    const list = document.getElementById('docs-list');
    list.innerHTML = '';

    if (!docs.length) {
      list.innerHTML = '<li>No documents available.</li>';
      return;
    }

    docs.forEach(doc => {
      // Ako ima ACF fajl koristi njega (download), inače fallback na WP link
      const url = doc.acf && doc.acf.document_file ? doc.acf.document_file : doc.link;

      const li = document.createElement('li');
      li.innerHTML = `<a href="${url}" ${doc.acf && doc.acf.document_file ? "download" : ""}>📄 ${doc.title.rendered}</a>`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading documents", err);
  }
}


// ----------------- Init -----------------
document.addEventListener("DOMContentLoaded", () => {
  loadVisitors();
  loadInterests();
  loadNews();
  loadDocuments();
});
