// search.js
document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("user-search-form");
    const input = document.getElementById("global-user-search");
    const resultsBox = document.getElementById("global-search-results");

    if (!form) return;

    form.addEventListener("submit", function(e) {
        e.preventDefault();
        let term = input.value.trim();
        if (!term) return;

        resultsBox.innerHTML = "<p>Searching...</p>";

        fetch(ajaxurl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "global_search_users",
                term: term
            })
        })
        .then(res => res.json())
        .then(data => {
            resultsBox.innerHTML = "";
            if (data.length) {
                data.forEach(user => {
                    let card = document.createElement("div");
                    card.classList.add("user-card");

                    let actionBtn = '';
                    if (user.status === 'accepted') {
                        // 👉 identičan link kao na profilu
                        actionBtn = `<a href="/chat/?chat_with=${user.ID}" class="btn-message">Message</a>`;
                    } else if (user.status === 'pending') {
                        actionBtn = `<button disabled>Request Sent</button>`;
                    } else if (user.status === 'none' || user.status === 'declined') {
                        actionBtn = `<button class="btn-connect" data-id="${user.ID}">Connect</button>`;
                    }

                    card.innerHTML = `
                        <h3>${user.display_name}</h3>
                        <p>${user.user_email}</p>
                        <a href="${user.profile_url}" class="btn-profile">View Profile</a>
                        ${actionBtn}
                    `;
                    resultsBox.appendChild(card);
                });
            } else {
                resultsBox.innerHTML = "<p>No users found.</p>";
            }
        });
    });

    // connect klik
    resultsBox.addEventListener("click", function(e) {
        if (e.target.classList.contains("btn-connect")) {
            let userId = e.target.dataset.id;

            fetch(ajaxurl, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    action: "send_connection_request",
                    target_id: userId
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    e.target.textContent = "Request Sent";
                    e.target.disabled = true;
                    e.target.style.background = "#aaa";
                } else {
                    alert(data.data);
                }
            });
        }
    });
});
// accept / decline klik
document.addEventListener("click", function(e) {
    if (e.target.classList.contains("btn-accept")) {
        let reqId = e.target.dataset.id;

        fetch(ajaxurl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "accept_connection",
                req_id: reqId
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                e.target.closest(".request-card").remove();
                alert("Request accepted!");
            } else {
                alert(data.data);
            }
        });
    }

    if (e.target.classList.contains("btn-decline")) {
        let reqId = e.target.dataset.id;

        fetch(ajaxurl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "decline_connection",
                req_id: reqId
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                e.target.closest(".request-card").remove();
                alert("Request declined!");
            } else {
                alert(data.data);
            }
        });
    }
});
