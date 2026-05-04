// main.js
document.addEventListener("DOMContentLoaded", function () {
    // Accordion tabs
    const tabs = document.querySelectorAll(".accordion-tab");
    const panels = document.querySelectorAll(".accordion-panel");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(tab.dataset.target).classList.add("active");
        });
    });

    // Mobile menu
    const hamburger = document.querySelector(".hamburger");
    const mobileMenu = document.querySelector("#mobileMenu");
    const closeBtn = document.querySelector(".close-mobile");

    if (hamburger && mobileMenu) {
        hamburger.addEventListener("click", () => {
            mobileMenu.classList.add("active");
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            mobileMenu.classList.remove("active");
        });
    }

    // Scroll helper
    scrollToBottom();
});

function scrollToBottom() {
    let box = document.querySelector(".messages");
    if (box) box.scrollTop = box.scrollHeight;
}
