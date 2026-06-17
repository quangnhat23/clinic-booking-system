(function () {
    const ADMIN_USER = {
        name: "Admin",
        email: "admin@clinic.demo",
        password: "admin123"
    };
    const AUTH_USER_KEY = "clinicCurrentUser";
    let currentUser = loadCurrentUser();
    let appointmentCache = null;

    const APPOINTMENTS_DATA_URL = "http://appointment-system-quangnguyen.s3-website-us-west-1.amazonaws.com";
    const LOCAL_APPOINTMENTS_KEY = "clinicAppointments";

    function loadCurrentUser() {
        try {
            const raw = localStorage.getItem(AUTH_USER_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && parsed.email && parsed.name ? parsed : null;
        } catch {
            return null;
        }
    }

    function saveCurrentUser(user) {
        try {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        } catch {
            // Ignore storage failures
        }
    }

    function clearCurrentUser() {
        try {
            localStorage.removeItem(AUTH_USER_KEY);
        } catch {
            // Ignore storage failures
        }
    }

    function loadAppointmentsFromStorage() {
        try {
            const raw = localStorage.getItem(LOCAL_APPOINTMENTS_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }

    function saveAppointmentsToStorage(appointments) {
        try {
            localStorage.setItem(LOCAL_APPOINTMENTS_KEY, JSON.stringify(appointments));
        } catch {
            // Ignore storage failures in constrained environments
        }
    }

    async function fetchRemoteAppointments() {
        try {
            const res = await fetch(APPOINTMENTS_DATA_URL, { cache: "no-cache" });
            if (!res.ok) {
                throw new Error(`Failed to load appointments: ${res.status}`);
            }
            const data = await res.json();
            appointmentCache = Array.isArray(data.appointments) ? data.appointments : [];
        } catch {
            const stored = loadAppointmentsFromStorage();
            appointmentCache = Array.isArray(stored) ? stored : [];
        }

        saveAppointmentsToStorage(appointmentCache);
        return appointmentCache;
    }

    async function getAppointments() {
        if (appointmentCache !== null) return appointmentCache;

        const stored = loadAppointmentsFromStorage();
        if (Array.isArray(stored)) {
            appointmentCache = stored;
            return appointmentCache;
        }

        return await fetchRemoteAppointments();
    }

    function nextId() {
        if (!appointmentCache || !appointmentCache.length) return 1;
        return Math.max(...appointmentCache.map((a) => Number(a.id) || 0)) + 1;
    }

    async function createAppointment(payload) {
        await getAppointments();
        const appointment = { id: nextId(), status: "booked", ...payload };
        appointmentCache.push(appointment);
        saveAppointmentsToStorage(appointmentCache);
        return appointment;
    }

    async function updateAppointment(id, payload) {
        await getAppointments();
        const appointment = appointmentCache.find((a) => Number(a.id) === Number(id));
        if (!appointment) throw new Error("Appointment not found.");
        Object.assign(appointment, payload);
        saveAppointmentsToStorage(appointmentCache);
        return appointment;
    }

    async function deleteAppointment(id) {
        await getAppointments();
        const index = appointmentCache.findIndex((a) => Number(a.id) === Number(id));
        if (index === -1) throw new Error("Appointment not found.");
        appointmentCache.splice(index, 1);
        saveAppointmentsToStorage(appointmentCache);
    }

    function sortAppointments(appointments) {
        return [...appointments].sort((a, b) => {
            const aKey = `${a.appointment_date} ${a.appointment_time}`;
            const bKey = `${b.appointment_date} ${b.appointment_time}`;
            return aKey.localeCompare(bKey);
        });
    }

    function withinClinicHours(time) {
        if (!/^\d{2}:\d{2}$/.test(time)) return false;
        const parts = time.split(":").map(Number);
        const minutes = parts[0] * 60 + parts[1];
        return minutes >= 540 && minutes <= 1020 && (parts[1] === 0 || parts[1] === 30);
    }

    function allSlots() {
        const slots = [];
        for (let minutes = 540; minutes <= 1020; minutes += 30) {
            const h = String(Math.floor(minutes / 60)).padStart(2, "0");
            const m = String(minutes % 60).padStart(2, "0");
            slots.push(`${h}:${m}`);
        }
        return slots;
    }

    function availableSlotsForDate(date, appointments, ignoreAppointmentId) {
        const booked = new Set(
            appointments
                .filter(
                    (a) =>
                        a.appointment_date === date &&
                        a.status === "booked" &&
                        Number(a.id) !== Number(ignoreAppointmentId)
                )
                .map((a) => a.appointment_time)
        );
        return allSlots().filter((slot) => !booked.has(slot));
    }

    function setMessage(el, text, type) {
        if (!el) return;
        el.textContent = text || "";
        el.className = type ? `message ${type}` : "message";
    }

    function updateAuthUi() {
        const statusEls = document.querySelectorAll("#auth-status");
        statusEls.forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            el.textContent = currentUser
                ? `Signed in as ${currentUser.name} (${currentUser.email})`
                : "Not signed in";
        });

        const forms = document.getElementById("auth-forms");
        const actions = document.getElementById("auth-actions");
        if (forms) forms.style.display = currentUser ? "none" : "grid";
        if (actions) actions.style.display = currentUser ? "flex" : "none";
    }

    function handleRegister(form, messageEl) {
        const fd = new FormData(form);
        const name = String(fd.get("name") || "").trim();
        const email = String(fd.get("email") || "").trim().toLowerCase();
        const password = String(fd.get("password") || "");

        if (
            name.toLowerCase() !== ADMIN_USER.name.toLowerCase() ||
            email !== ADMIN_USER.email ||
            password !== ADMIN_USER.password
        ) {
            throw new Error(`Register accepts only admin credentials: ${ADMIN_USER.name} / ${ADMIN_USER.email} / ${ADMIN_USER.password}`);
        }

        currentUser = { name: ADMIN_USER.name, email: ADMIN_USER.email };
        saveCurrentUser(currentUser);
        updateAuthUi();
        setMessage(messageEl, "Admin account accepted. You are signed in.", "success");
        form.reset();
    }

    function handleLogin(form, messageEl) {
        const fd = new FormData(form);
        const email = String(fd.get("email") || "").trim().toLowerCase();
        const password = String(fd.get("password") || "");
        if (email !== ADMIN_USER.email || password !== ADMIN_USER.password) {
            throw new Error(`Invalid admin credentials. Use ${ADMIN_USER.email} / ${ADMIN_USER.password}`);
        }

        currentUser = { name: ADMIN_USER.name, email: ADMIN_USER.email };
        saveCurrentUser(currentUser);
        updateAuthUi();
        setMessage(messageEl, "Signed in successfully (admin mode).", "success");
        form.reset();
    }

    function tryPromptLogin() {
        const email = prompt("Admin login email:", ADMIN_USER.email);
        if (!email) return false;
        const password = prompt("Admin login password:", ADMIN_USER.password);
        if (!password) return false;
        if (email.trim().toLowerCase() !== ADMIN_USER.email || password !== ADMIN_USER.password) {
            return false;
        }
        currentUser = { name: ADMIN_USER.name, email: ADMIN_USER.email };
        updateAuthUi();
        return true;
    }

    function initAuthCommon() {
        const registerForm = document.getElementById("register-form");
        const loginForm = document.getElementById("login-form");
        const logoutBtn = document.getElementById("logout-btn");
        const messageEl = document.getElementById("message");

        if (registerForm instanceof HTMLFormElement) {
            registerForm.addEventListener("submit", (e) => {
                e.preventDefault();
                setMessage(messageEl, "", "");
                try {
                    handleRegister(registerForm, messageEl);
                } catch (err) {
                    setMessage(messageEl, err.message || "Registration failed.", "error");
                }
            });
        }

        if (loginForm instanceof HTMLFormElement) {
            loginForm.addEventListener("submit", (e) => {
                e.preventDefault();
                setMessage(messageEl, "", "");
                try {
                    handleLogin(loginForm, messageEl);
                } catch (err) {
                    setMessage(messageEl, err.message || "Login failed.", "error");
                }
            });
        }

        if (logoutBtn instanceof HTMLButtonElement) {
            logoutBtn.addEventListener("click", () => {
                currentUser = null;
                clearCurrentUser();
                updateAuthUi();
                setMessage(messageEl, "Logged out.", "success");
            });
        }

        updateAuthUi();
    }

    async function refreshSlots(date, selectEl, messageEl, ignoreAppointmentId) {
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
            const appointments = await getAppointments();
            const slots = availableSlotsForDate(date, appointments, ignoreAppointmentId);
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
            setMessage(messageEl, "Unable to load available slots.", "error");
        }

        setMessage(messageEl, "", "");
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

            if (!currentUser) {
                setMessage(message, "Please register or log in first.", "error");
                return;
            }

            const formData = new FormData(form);
            const patient_name = String(formData.get("patient_name") || "").trim();
            const appointment_date = String(formData.get("appointment_date") || "");
            const appointment_time = String(formData.get("appointment_time") || "");

            if (!patient_name || !appointment_date || !appointment_time) {
                setMessage(message, "Please enter patient name, date, and time.", "error");
                return;
            }
            if (!withinClinicHours(appointment_time)) {
                setMessage(message, "Please choose a valid 30-minute slot between 09:00 and 17:00.", "error");
                return;
            }

            try {
                await createAppointment({ patient_name, appointment_date, appointment_time });
                setMessage(message, "Appointment booked successfully.", "success");
                form.reset();
                if (dateEl instanceof HTMLInputElement && timeEl instanceof HTMLSelectElement) {
                    refreshSlots(dateEl.value, timeEl, message);
                }
            } catch (err) {
                setMessage(message, err.message || "Failed to create appointment.", "error");
            }
        });
    }

    async function renderAppointments(tbody, emptyState, messageEl) {
        tbody.innerHTML = "";
        if (!currentUser) {
            emptyState.style.display = "block";
            setMessage(messageEl, "Log in as admin on this page to manage appointments.", "error");
            return;
        }

        let appointments = [];
        try {
            appointments = await getAppointments();
        } catch (err) {
            setMessage(messageEl, err.message || "Failed to load appointments.", "error");
            emptyState.style.display = "block";
            return;
        }

        if (appointments.length === 0) {
            emptyState.style.display = "block";
            setMessage(messageEl, "No appointments yet.", "info");
            return;
        }
        emptyState.style.display = "none";

        sortAppointments(appointments).forEach((appt) => {
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
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${appt.id}" type="button">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function initAdminPage() {
        const tbody = document.getElementById("appointments-body");
        if (!(tbody instanceof HTMLElement)) return;

        const emptyState = document.getElementById("empty-state");
        const messageEl = document.getElementById("message");

        initAuthCommon();
        if (!currentUser) {
            const loggedIn = tryPromptLogin();
            if (!loggedIn) {
                setMessage(
                    messageEl,
                    `Use admin credentials to manage appointments: ${ADMIN_USER.email} / ${ADMIN_USER.password}`,
                    "error"
                );
            }
        }

        async function safeRender() {
            try {
                await renderAppointments(tbody, emptyState, messageEl);
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
            if (!currentUser) {
                const loggedIn = tryPromptLogin();
                if (!loggedIn) {
                    setMessage(messageEl, "Please log in first.", "error");
                    return;
                }
            }

            try {
                if (action === "cancel") {
                    if (!confirm("Cancel this appointment?")) return;
                    await updateAppointment(id, { status: "cancelled" });
                    setMessage(messageEl, "Appointment cancelled.", "success");
                    await safeRender();
                    return;
                }

                if (action === "delete") {
                    if (!confirm("Delete this appointment permanently?")) return;
                    await deleteAppointment(id);
                    setMessage(messageEl, "Appointment deleted.", "success");
                    await safeRender();
                    return;
                }

                if (action === "reschedule") {
                    const currentAppt = (await getAppointments()).find((a) => Number(a.id) === id);
                    if (!currentAppt) {
                        setMessage(messageEl, "Appointment not found.", "error");
                        return;
                    }
                    const date = prompt("New date (YYYY-MM-DD):", currentAppt.appointment_date);
                    if (!date) return;
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        setMessage(messageEl, "Date format must be YYYY-MM-DD.", "error");
                        return;
                    }
                    const time = prompt("New time (HH:MM):", currentAppt.appointment_time);
                    if (!time) return;
                    if (!withinClinicHours(time)) {
                        setMessage(messageEl, "Time must be a 30-minute slot between 09:00 and 17:00.", "error");
                        return;
                    }

                    await updateAppointment(id, { appointment_date: date, appointment_time: time });
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
