/**
 * Shared UI: toasts, loading states, validation, animations, mobile nav.
 */
(function () {
    const TOAST_DURATION = 5200;

    function ensureToastContainer() {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.className = "toast-container";
            container.setAttribute("role", "status");
            container.setAttribute("aria-live", "polite");
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(message, type) {
        const container = ensureToastContainer();
        const toast = document.createElement("div");
        toast.className = `toast toast-${type || "info"}`;
        toast.innerHTML = `
            <span class="toast-icon" aria-hidden="true">${type === "success" ? "&#10003;" : type === "error" ? "&#10007;" : "&#9432;"}</span>
            <span class="toast-message">${message}</span>
            <button type="button" class="toast-close" aria-label="Dismiss">&times;</button>
        `;

        const close = () => {
            toast.classList.add("toast-exit");
            setTimeout(() => toast.remove(), 220);
        };

        toast.querySelector(".toast-close").addEventListener("click", close);
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("toast-enter"));

        const timer = setTimeout(close, TOAST_DURATION);
        toast.addEventListener("mouseenter", () => clearTimeout(timer));
    }

    function setButtonLoading(button, loading, loadingText) {
        if (!button) return;
        const textEl = button.querySelector(".btn-text");
        const loadEl = button.querySelector(".btn-loading");

        button.disabled = loading;
        button.setAttribute("aria-busy", loading ? "true" : "false");

        if (textEl && loadEl) {
            textEl.style.display = loading ? "none" : "";
            loadEl.style.display = loading ? "inline" : "none";
            if (loadingText) loadEl.textContent = loadingText;
        } else if (loading) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText || "Please wait...";
        } else if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }

    function setFieldError(input, message) {
        if (!input) return;
        const group = input.closest(".form-group");
        let hint = group && group.querySelector(".field-error");

        if (message) {
            input.classList.add("input-invalid");
            input.setAttribute("aria-invalid", "true");
            if (group) {
                if (!hint) {
                    hint = document.createElement("span");
                    hint.className = "field-error";
                    hint.setAttribute("role", "alert");
                    group.appendChild(hint);
                }
                hint.textContent = message;
            }
        } else {
            input.classList.remove("input-invalid");
            input.removeAttribute("aria-invalid");
            if (hint) hint.remove();
        }
    }

    function clearFormErrors(form) {
        if (!form) return;
        form.querySelectorAll(".input-invalid").forEach((el) => setFieldError(el, null));
    }

    function validatePhone(value) {
        const digits = String(value || "").replace(/\D/g, "");
        return digits.length >= 10;
    }

    function validateComplaint(value) {
        return String(value || "").trim().length >= 40;
    }

    function initPageLoader() {
        const loader = document.getElementById("page-loader");
        if (!loader) return;

        window.addEventListener("load", () => {
            document.body.classList.add("is-loaded");
            loader.classList.add("is-hidden");
        });

        setTimeout(() => {
            document.body.classList.add("is-loaded");
            loader.classList.add("is-hidden");
        }, 1200);
    }

    function initRevealOnScroll() {
        const reveals = document.querySelectorAll(".reveal");
        if (!reveals.length) return;

        if (!("IntersectionObserver" in window)) {
            reveals.forEach((el) => el.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
        );

        reveals.forEach((el) => observer.observe(el));
    }

    function initStepDots() {
        document.querySelectorAll("[data-step-dot]").forEach((dot) => {
            dot.addEventListener("click", () => {
                const step = Number(dot.dataset.stepDot);
                const target = document.querySelector(`[data-step="${step}"]`);
                if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            });
        });
    }

    function syncStepDots(step) {
        document.querySelectorAll("[data-step-dot]").forEach((dot) => {
            const n = Number(dot.dataset.stepDot);
            dot.classList.toggle("active", n === step);
        });
    }

    function animateUploadProgress(barEl, wrapEl) {
        if (!barEl || !wrapEl) return;
        wrapEl.hidden = false;
        barEl.style.width = "0%";
        let progress = 0;
        const tick = setInterval(() => {
            progress = Math.min(progress + Math.random() * 18 + 8, 92);
            barEl.style.width = `${progress}%`;
        }, 180);
        return {
            complete() {
                clearInterval(tick);
                barEl.style.width = "100%";
                setTimeout(() => {
                    wrapEl.hidden = true;
                    barEl.style.width = "0%";
                }, 400);
            },
            stop() {
                clearInterval(tick);
                wrapEl.hidden = true;
                barEl.style.width = "0%";
            }
        };
    }

    function initPasswordToggles() {
        document.querySelectorAll("[data-password-toggle]").forEach((button) => {
            const targetId = button.getAttribute("data-password-toggle");
            const input = document.getElementById(targetId);
            if (!input) return;

            button.addEventListener("click", () => {
                const show = input.type === "password";
                input.type = show ? "text" : "password";
                button.setAttribute("aria-label", show ? "Hide password" : "Show password");
                button.textContent = show ? "Hide" : "Show";
            });
        });
    }

    function initFileDropzone(dropzone) {
        const input = dropzone.querySelector('input[type="file"]');
        const nameEl = dropzone.querySelector(".file-selected-name");
        if (!input) return;

        ["dragenter", "dragover"].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropzone.classList.add("file-dropzone-active");
            });
        });

        ["dragleave", "drop"].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropzone.classList.remove("file-dropzone-active");
            });
        });

        dropzone.addEventListener("drop", (e) => {
            const file = e.dataTransfer.files[0];
            if (!file) return;
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
        });

        input.addEventListener("change", () => {
            const file = input.files[0];
            if (nameEl) {
                nameEl.textContent = file ? file.name : "";
                nameEl.hidden = !file;
            }
            dropzone.classList.toggle("file-dropzone-has-file", Boolean(file));
        });
    }

    window.PortalUI = {
        showToast,
        setButtonLoading,
        setFieldError,
        clearFormErrors,
        validatePhone,
        validateComplaint,
        initPasswordToggles,
        initFileDropzone,
        syncStepDots,
        animateUploadProgress
    };

    document.addEventListener("DOMContentLoaded", () => {
        initPageLoader();
        initRevealOnScroll();
        initStepDots();
        initPasswordToggles();
        document.querySelectorAll(".file-dropzone").forEach(initFileDropzone);
    });
})();
