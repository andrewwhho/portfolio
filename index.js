// -------------------------------------------------------------
// ANDREW HO - PORTFOLIO JAVASCRIPT
// Interactive Functionality: Tabs, Accordion, Audio Player, Toast
// -------------------------------------------------------------

// --- Tab Switching for Experience & Education ---
function opentab(event, tabname) {
    const tablinks = document.getElementsByClassName("tab-links");
    const tabcontents = document.getElementsByClassName("tab-contents");

    for (let tablink of tablinks) {
        tablink.classList.remove("active-link");
    }
    for (let tabcontent of tabcontents) {
        tabcontent.classList.remove("active-tab");
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active-link");
    }
    const targetTab = document.getElementById(tabname);
    if (targetTab) {
        targetTab.classList.add("active-tab");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // --- Experience Accordion Toggle ---
    const qaDropdownBtn = document.querySelector(".qa-dropdown-toggle");
    const qaDropdownContent = document.querySelector(".qa-dropdown-content");

    if (qaDropdownBtn && qaDropdownContent) {
        qaDropdownBtn.addEventListener("click", () => {
            qaDropdownBtn.classList.toggle("active");
            qaDropdownContent.classList.toggle("show");
        });
    }

    // --- Floating Audio Player Widget ---
    const audioElement = document.getElementById("audioElement");
    const playPauseBtn = document.getElementById("playPauseBtn");
    const musicPlayerWidget = document.getElementById("musicPlayer");

    if (audioElement && playPauseBtn && musicPlayerWidget) {
        const playIcon = playPauseBtn.querySelector(".play-icon");
        const pauseIcon = playPauseBtn.querySelector(".pause-icon");

        function setPlayingState(isPlaying) {
            if (isPlaying) {
                musicPlayerWidget.classList.add("playing");
                if (playIcon) playIcon.style.display = "none";
                if (pauseIcon) pauseIcon.style.display = "block";
            } else {
                musicPlayerWidget.classList.remove("playing");
                if (playIcon) playIcon.style.display = "block";
                if (pauseIcon) pauseIcon.style.display = "none";
            }
        }

        playPauseBtn.addEventListener("click", () => {
            if (audioElement.paused) {
                audioElement.play().then(() => {
                    setPlayingState(true);
                }).catch(err => {
                    console.log("Audio playback error:", err);
                });
            } else {
                audioElement.pause();
                setPlayingState(false);
            }
        });

        audioElement.addEventListener("ended", () => {
            setPlayingState(false);
        });

        audioElement.addEventListener("pause", () => {
            setPlayingState(false);
        });

        audioElement.addEventListener("play", () => {
            setPlayingState(true);
        });
    }

    // --- Copy Email to Clipboard & Toast Alert ---
    const copyEmailBtn = document.getElementById("copyEmailBtn");
    const toast = document.getElementById("toast");
    let toastTimeout = null;

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add("show");

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    if (copyEmailBtn) {
        copyEmailBtn.addEventListener("click", () => {
            const email = copyEmailBtn.getAttribute("data-email") || "andrewwhho@gmail.com";
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(email).then(() => {
                    showToast("Copied to clipboard: " + email);
                }).catch(() => {
                    fallbackCopy(email);
                });
            } else {
                fallbackCopy(email);
            }
        });
    }

    function fallbackCopy(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand("copy");
            showToast("Copied to clipboard: " + text);
        } catch (e) {
            showToast("Email: " + text);
        }
        document.body.removeChild(textArea);
    }

    // --- Resume Button Notice ---
    const resumeBtn = document.getElementById("resumeBtn");
    if (resumeBtn) {
        resumeBtn.addEventListener("click", (e) => {
            // Smoothly scrolls to contact section and shows helpful message
            showToast("Reach out via email or LinkedIn for a tailored PDF resume!");
        });
    }

    // --- Mobile Navigation Toggle ---
    const navToggle = document.getElementById("navToggle");
    const navLinks = document.getElementById("navLinks");

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => {
            navToggle.classList.toggle("open");
            navLinks.classList.toggle("show-menu");
        });

        // Close menu when clicking a link
        const navAnchorLinks = navLinks.querySelectorAll("a");
        navAnchorLinks.forEach(link => {
            link.addEventListener("click", () => {
                navToggle.classList.remove("open");
                navLinks.classList.remove("show-menu");
            });
        });
    }
});
