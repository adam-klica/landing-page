// groups.js
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("create-group-form");
    const result = document.getElementById("create-group-result");

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            const formData = new FormData(form);
            formData.append("action", "create_group");

            fetch(ajaxurl, {
                method: "POST",
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    result.innerHTML = "<span style='color:green'>Grupa kreirana ✅</span>";
                    setTimeout(() => location.reload(), 800);
                } else {
                    result.innerHTML = "<span style='color:red'>" + data.data + "</span>";
                }
            })
            .catch(err => {
                result.innerHTML = "<span style='color:red'>Greška u mreži</span>";
            });
        });
    }
});

// Brisanje grupe
document.addEventListener("click", function(e) {
    if (e.target.classList.contains("delete-group")) {
        if (!confirm("Da li ste sigurni da želite obrisati grupu?")) return;
        let groupId = e.target.dataset.group;

        fetch(ajaxurl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "delete_group",
                group_id: groupId
            })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.data);
            if (data.success) {
                window.location.href = window.location.pathname; 
            }
        });
    }
});

// Napuštanje grupe
document.addEventListener("click", function(e) {
    if (e.target.classList.contains("leave-group")) {
        if (!confirm("Da li ste sigurni da želite napustiti grupu?")) return;
        let groupId = e.target.dataset.group;

        fetch(ajaxurl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "leave_group",
                group_id: groupId
            })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.data);
            if (data.success) {
                window.location.href = window.location.pathname; 
            }
        });
    }
});
