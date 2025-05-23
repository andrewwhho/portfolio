var tablinks = document.getElementsByClassName("tab-links");
var tabcontents = document.getElementsByClassName("tab-contents");

function opentab(event, tabname) {
    // Remove active class from all tabs
    for (let tablink of tablinks) {
        tablink.classList.remove("active-link");
    }
    for (let tabcontent of tabcontents) {
        tabcontent.classList.remove("active-tab");
    }

    // Apply active class to the clicked tab using event.currentTarget
    event.currentTarget.classList.add("active-link");
    document.getElementById(tabname).classList.add("active-tab");
}

document.querySelector(".qa-dropdown button").addEventListener("click", function () {
    document.querySelector(".qa-dropdown-content").classList.toggle("show");
});

// Close dropdown when clicking outside
window.addEventListener("click", function (event) {
    if (!event.target.matches(".qa-dropdown button")) {
        document.querySelector(".qa-dropdown-content").classList.remove("show");
    }
});