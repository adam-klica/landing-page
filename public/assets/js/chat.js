// chat.js
jQuery(document).ready(function ($) {
    let lastId = 0;
    let lastGroupMsgId = 0;

    let receiverId = $("input[name=receiver_id]").val();
    let groupId = $("input[name=group_id]").val();

    // globalni intervali
    let privateInterval = null;
    let groupInterval = null;
    let unreadInterval = null;

    // ---------------- RENDER ----------------
    function renderMessage(msg) {
        // Ako poruka već postoji – preskoči
        if ($(`.message[data-id='${msg.id}']`).length) return;

        let msgHtml = `<div class="message ${msg.sender_id == CURRENT_USER_ID ? "sent" : "received"}" data-id="${msg.id}">
            ${msg.message ? `<p>${msg.message}</p>` : ""}
            ${msg.file ? (/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.file)
                ? `<p><img src="${msg.file}" style="max-width:200px;border-radius:5px;"></p>`
                : `<p><a href="${msg.file}" target="_blank">📎 Fajl</a></p>`) : ""}
            <span class="time">${msg.created_at || msg.time}</span>
        </div>`;

        $(".messages").append(msgHtml);

        // sortiraj po ID-u (sigurnost)
        let msgs = $(".messages .message").sort(function (a, b) {
            return parseInt($(a).data("id")) - parseInt($(b).data("id"));
        });
        $(".messages").html(msgs);

        $(".messages").scrollTop($(".messages")[0].scrollHeight);
    }

    // ---------------- PRIVATNI ----------------
    function sendChatMessage() {
        let message = $.trim($("#chat-message").val());
        let fileInput = $("#chat-file")[0] ? $("#chat-file")[0].files.length : 0;

        if (!message && !fileInput) return false;

        let form = $("#chat-form")[0];
        let formData = new FormData(form);
        formData.append("action", "send_chat_message");

        $.ajax({
            url: ajaxurl,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (resp) {
                if (resp.success) {
                    renderMessage({
                        id: resp.data.id,
                        sender_id: CURRENT_USER_ID,
                        message: resp.data.message,
                        file: resp.data.file,
                        time: resp.data.time
                    });
                    lastId = resp.data.id;
                    $("#chat-message").val("");
                    $("#chat-file").val("");
                    $("#file-name").text("Nijedan fajl nije izabran");
                } else {
                    alert("Greška: " + resp.data);
                }
            }
        });
    }

    // ---------------- GRUPNI ----------------
    function sendGroupMessage() {
        let message = $.trim($("#group-message").val());
        let fileInput = $("#group-file")[0] ? $("#group-file")[0].files.length : 0;

        if (!message && !fileInput) return false;

        let form = $("#group-chat-form")[0];
        let formData = new FormData(form);
        formData.append("action", "send_group_message");

        $.ajax({
            url: ajaxurl,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (resp) {
                if (resp.success) {
                    renderMessage({
                        id: resp.data.id,
                        sender_id: CURRENT_USER_ID,
                        message: resp.data.message,
                        file: resp.data.file,
                        time: resp.data.time
                    });
                    lastGroupMsgId = resp.data.id;
                    $("#group-message").val("");
                    $("#group-file").val("");
                    $("#group-file-name").text("Nijedan fajl nije izabran");
                } else {
                    alert("Greška: " + resp.data);
                }
            }
        });
    }

    // ---------------- SUBMIT + ENTER ----------------
    $("#chat-form").off("submit").on("submit", function (e) {
        e.preventDefault();
        sendChatMessage();
    });
    $("#group-chat-form").off("submit").on("submit", function (e) {
        e.preventDefault();
        sendGroupMessage();
    });

    $(document).on("keydown", "#chat-message", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    $(document).on("keydown", "#group-message", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendGroupMessage();
        }
    });

    // ---------------- FILE PREVIEW ----------------
    $("#chat-file").on("change", function () {
        let fileName = $(this).val().split("\\").pop();
        $("#file-name").text(fileName || "Nijedan fajl nije izabran");
    });
    $("#group-file").on("change", function () {
        let fileName = $(this).val().split("\\").pop();
        $("#group-file-name").text(fileName || "Nijedan fajl nije izabran");
    });

    // ---------------- AUTO REFRESH PRIVATNI ----------------
    if (receiverId) {
        lastId = Math.max.apply(Math, $(".messages .message").map(function () {
            return $(this).data("id");
        }).get()) || 0;

        if (privateInterval) clearInterval(privateInterval);
        privateInterval = setInterval(function () {
            $.post(
                ajaxurl,
                { action: "get_messages", receiver_id: receiverId, last_id: lastId },
                function (response) {
                    if (response.success && response.data.length > 0) {
                        response.data.forEach((msg) => renderMessage(msg));
                        let maxId = Math.max.apply(Math, response.data.map(m => m.id));
                        if (maxId > lastId) lastId = maxId;
                    }
                }
            );
        }, 1000);
    }

    // ---------------- AUTO REFRESH GRUPNI ----------------
    if (groupId) {
        lastGroupMsgId = Math.max.apply(Math, $(".messages .message").map(function () {
            return $(this).data("id");
        }).get()) || 0;

        if (groupInterval) clearInterval(groupInterval);
        groupInterval = setInterval(function () {
            $.post(
                ajaxurl,
                { action: "get_group_messages", group_id: groupId, last_id: lastGroupMsgId },
                function (response) {
                    if (response.success && response.data.length > 0) {
                        response.data.forEach((msg) => renderMessage(msg));
                        let maxId = Math.max.apply(Math, response.data.map(m => m.id));
                        if (maxId > lastGroupMsgId) lastGroupMsgId = maxId;
                    }
                }
            );
        }, 1000);

        $.post(ajaxurl, { action: "mark_group_read", group_id: groupId }, function (resp) {
            if (resp.success) {
                $(`.unread-count-group[data-group='${groupId}']`).text("").hide();
            }
        });
    }

    // ---------------- UNREAD BADGE ----------------
    if (!unreadInterval) {
        unreadInterval = setInterval(function () {
            $.post(ajaxurl, { action: "get_unread_counts" }, function (response) {
                if (response.success) {
                    $(".unread-count").text("").hide();
                    for (let userId in response.data.users) {
                        let count = response.data.users[userId];
                        if (count > 0) {
                            $(`.unread-count[data-user='${userId}']`).text(count).show();
                        }
                    }
                    $(".unread-count-group").text("").hide();
                    for (let gId in response.data.groups) {
                        let count = response.data.groups[gId];
                        if (count > 0) {
                            $(`.unread-count-group[data-group='${gId}']`).text(count).show();
                        }
                    }
                }
            });
        }, 2000);
    }

    // ---------------- TABOVI ----------------
    $(document).on("click", ".tab-btn", function () {
        let target = $(this).data("target");
        let container = $(this).closest(".chat-box");
        container.find(".tab-btn").removeClass("active");
        container.find(".tab-content").removeClass("active");
        $(this).addClass("active");
        $("#" + target).addClass("active");
    });

    // ---------------- ČLANOVI GRUPE ----------------
    $(document).on("submit", "#add-member-form", function (e) {
        e.preventDefault();
        let formData = $(this).serialize() + "&action=add_group_member";
        $.post(ajaxurl, formData, function (response) {
            alert(response.data);
            if (response.success) location.reload();
        });
    });

    $(document).on("click", ".remove-member", function () {
        if (!confirm("Da li si siguran da želiš da ukloniš člana?")) return;
        let userId = $(this).data("user");
        let gId = $(this).data("group");
        $.post(
            ajaxurl,
            { action: "remove_group_member", user_id: userId, group_id: gId },
            function (response) {
                alert(response.data);
                if (response.success) location.reload();
            }
        );
    });

    // leave i delete group
    $(document).on("click", ".leave-group", function () {
        if (!confirm("Napustiti grupu?")) return;
        let gId = $(this).data("group");
        $.post(ajaxurl, { action: "leave_group", group_id: gId }, function (response) {
            alert(response.data);
            if (response.success) window.location.href = window.location.pathname;
        });
    });

    $(document).on("click", ".delete-group", function () {
        if (!confirm("Obrisati grupu?")) return;
        let gId = $(this).data("group");
        $.post(ajaxurl, { action: "delete_group", group_id: gId }, function (response) {
            alert(response.data);
            if (response.success) window.location.href = window.location.pathname;
        });
    });
});

// ---------------- BACK BUTTON ----------------
document.addEventListener("DOMContentLoaded", function () {
    const backBtn = document.querySelector(".back-btn");
    if (backBtn) {
        backBtn.addEventListener("click", function () {
            window.location.href = window.location.pathname;
        });
    }
});
