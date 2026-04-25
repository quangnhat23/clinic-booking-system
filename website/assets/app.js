(function () {
    const API_BASE = "";
    const TOKEN_KEY = "clinic_token_v1";
    const USER_KEY = "clinic_user_v1";

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || "";
    }

    function getUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function setAuth(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function clearAuth() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    async function api(path, options) {
        const token = getToken();
        const headers = Object.assign(
            { "Content-Type": "application/json" },
            options?.headers || {},
            token ? { Authorization: `Bearer ${token}` } : {}
        );

        const res = await fetch(`${API_BASE}${path}`, Object.assign({}, options, { headers }));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data?.error || `Request failed (${res.status})`;
            throw new Error(msg);
        }
        return data;
    }

    function setMessage(el, text, type) {
        if (!el) return;
        el.textContent = text || "";
        el.className = type ? `message ${type}` : "message";
    }

    function updateAuthUi() {
        const user = getUser();

        const statusEls = document.querySelectorAll("#auth-status");
        statusEls.forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            el.textContent = user ? `Signed in as ${user.name} (${user.email})` : "Not signed in";
        });

        const forms = document.getElementById("auth-forms");
        const actions = document.getElementById("auth-actions");
        if (forms) forms.style.display = user ? "none" : "grid";
        if (actions) actions.style.display = user ? "flex" : "none";

        const patientName = document.getElementById("patient_name");
        if (patientName instanceof HTMLInputElement) {
            patientName.value = user ? user.name : "";
        }
    }

    async function handleRegister(form, messageEl) {
        const fd = new FormData(form);
        const payload = {
            name: String(fd.get("name") || "").trim(),
            email: String(fd.get("email") || "").trim(),
            password: String(fd.get("password") || "")
        };
        const data = await api("/api/register", { method: "POST", body: JSON.stringify(payload) });
        setAuth(data.token, data.user);
        updateAuthUi();
        setMessage(messageEl, "Account created. You are signed in.", "success");
        form.reset();
    }

    async function handleLogin(form, messageEl) {
        const fd = new FormData(form);
        const payload = {
            email: String(fd.get("email") || "").trim(),
            password: String(fd.get("password") || "")
        };
        const data = await api("/api/login", { method: "POST", body: JSON.stringify(payload) });
        setAuth(data.token, data.user);
        updateAuthUi();
        setMessage(messageEl, "Signed in successfully.", "success");
        form.reset();
    }

    function initAuthCommon() {
        const registerForm = document.getElementById("register-form");
        const loginForm = document.getElementById("login-form");
        const logoutBtn = document.getElementById("logout-btn");
        const messageEl = document.getElementById("message");

        if (registerForm instanceof HTMLFormElement) {
            registerForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                setMessage(messageEl, "", "");
                try {
                    await handleRegister(registerForm, messageEl);
                } catch (err) {
                    setMessage(messageEl, err.message || "Registration failed.", "error");
                }
            });
        }

        if (loginForm instanceof HTMLFormElement) {
            loginForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                setMessage(messageEl, "", "");
                try {
                    await handleLogin(loginForm, messageEl);
                } catch (err) {
                    setMessage(messageEl, err.message || "Login failed.", "error");
                }
            });
        }

        if (logoutBtn instanceof HTMLButtonElement) {
            logoutBtn.addEventListener("click", () => {
                clearAuth();
                updateAuthUi();
                setMessage(messageEl, "Logged out.", "success");
            });
        }

        updateAuthUi();
    }

    async function refreshSlots(date, selectEl, messageEl) {
        if (!selectEl) return;
        selectEl.innerHTML = "";

        if (!date) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Select a date first";
            selectEl.appendChild(opt);
            return;
        }

        try {
            const data = await api(`/api/slots?date=${encodeURIComponent(date)}`, { method: "GET" });
            const slots = data.slots || [];

            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = slots.length ? "Select a time" : "No slots available";
            selectEl.appendChild(placeholder);

            slots.forEach((t) => {
                const opt = document.createElement("option");
                opt.value = t;
                opt.textContent = t;
                selectEl.appendChild(opt);
            });
        } catch (err) {
            setMessage(messageEl, err.message || "Failed to load slots.", "error");
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Failed to load slots";
            selectEl.appendChild(opt);
        }
    }

    function initBookingPage() {
        const form = document.getElementById("booking-form");
        if (!(form instanceof HTMLFormElement)) return;

        initAuthCommon();

        const message = document.getElementById("message");
        const dateEl = document.getElementById("appointment_date");
        const timeEl = document.getElementById("appointment_time");

        if (dateEl instanceof HTMLInputElement && timeEl instanceof HTMLSelectElement) {
            dateEl.addEventListener("change", () => {
                refreshSlots(dateEl.value, timeEl, message);
            });
        }

        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const user = getUser();
            if (!user || !getToken()) {
                setMessage(message, "Please register or log in first.", "error");
                return;
            }

            const formData = new FormData(form);
            const appointment_date = String(formData.get("appointment_date") || "");
            const appointment_time = String(formData.get("appointment_time") || "");

            if (!appointment_date || !appointment_time) {
                setMessage(message, "Please select a date and time.", "error");
                return;
            }

            try {
                await api("/api/appointments", {
                    method: "POST",
                    body: JSON.stringify({ appointment_date, appointment_time })
                });
                setMessage(message, "Appointment booked successfully.", "success");
                if (dateEl instanceof HTMLInputElement && timeEl instanceof HTMLSelectElement) {
                    await refreshSlots(dateEl.value, timeEl, message);
                }
            } catch (err) {
                setMessage(message, err.message || "Booking failed.", "error");
            }
        });
    }

    async function renderMyAppointments(tbody, emptyState, messageEl) {
        tbody.innerHTML = "";
        const user = getUser();
        if (!user || !getToken()) {
            emptyState.style.display = "block";
            return;
        }

        const data = await api("/api/appointments", { method: "GET" });
        const appointments = data.appointments || [];
        if (appointments.length === 0) {
            emptyState.style.display = "block";
            return;
        }
        emptyState.style.display = "none";

        appointments.forEach((appt) => {
            const tr = document.createElement("tr");
            const disabled = appt.status !== "booked" ? "disabled" : "";
            tr.innerHTML = `
                <td>${appt.id}</td>
                <td>${appt.patient_name}</td>
                <td>${appt.appointment_date}</td>
                <td>${appt.appointment_time}</td>
                <td>${appt.status}</td>
                <td class="table-actions">
                    <button class="btn btn-secondary btn-sm" data-action="reschedule" data-id="${appt.id}" ${disabled} type="button">Reschedule</button>
                    <button class="btn btn-danger btn-sm" data-action="cancel" data-id="${appt.id}" ${disabled} type="button">Cancel</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        setMessage(messageEl, "", "");
    }

    function initAdminPage() {
        const tbody = document.getElementById("appointments-body");
        if (!(tbody instanceof HTMLElement)) return;

        const emptyState = document.getElementById("empty-state");
        const messageEl = document.getElementById("message");

        initAuthCommon();

        async function safeRender() {
            try {
                await renderMyAppointments(tbody, emptyState, messageEl);
            } catch (err) {
                setMessage(messageEl, err.message || "Failed to load appointments.", "error");
            }
        }

        tbody.addEventListener("click", async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const idAttr = target.getAttribute("data-id");
            const action = target.getAttribute("data-action");
            if (!idAttr || !action) return;
            const id = Number(idAttr);

            setMessage(messageEl, "", "");

            try {
                if (action === "cancel") {
                    if (!confirm("Cancel this appointment?")) return;
                    await api(`/api/appointments/${id}`, { method: "DELETE" });
                    setMessage(messageEl, "Appointment cancelled.", "success");
                    await safeRender();
                    return;
                }

                if (action === "reschedule") {
                    const date = prompt("New date (YYYY-MM-DD):");
                    if (!date) return;

                    const slots = await api(`/api/slots?date=${encodeURIComponent(date)}`, { method: "GET" });
                    const slotList = (slots.slots || []).slice(0, 20).join(", ");
                    const time = prompt(`New time (HH:MM). Available: ${slotList}${(slots.slots || []).length > 20 ? ", ..." : ""}`);
                    if (!time) return;

                    await api(`/api/appointments/${id}/reschedule`, {
                        method: "PATCH",
                        body: JSON.stringify({ appointment_date: date, appointment_time: time })
                    });
                    setMessage(messageEl, "Appointment rescheduled.", "success");
                    await safeRender();
                }
            } catch (err) {
                setMessage(messageEl, err.message || "Action failed.", "error");
            }
        });

        safeRender();
    }

    initBookingPage();
    initAdminPage();
})();
