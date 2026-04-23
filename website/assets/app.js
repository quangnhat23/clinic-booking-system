(function () {
    const STORAGE_KEY = "clinic_appointments_v1";

    function loadAppointments() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.error("Failed to parse appointments from storage", error);
            return [];
        }
    }

    function saveAppointments(appointments) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    }

    function nextId(appointments) {
        if (appointments.length === 0) return 1;
        return Math.max(...appointments.map((a) => Number(a.id) || 0)) + 1;
    }

    function sortAppointments(appointments) {
        return [...appointments].sort((a, b) => {
            const aKey = `${a.appointment_date} ${a.appointment_time}`;
            const bKey = `${b.appointment_date} ${b.appointment_time}`;
            if (aKey < bKey) return -1;
            if (aKey > bKey) return 1;
            return 0;
        });
    }

    function initBookingPage() {
        const form = document.getElementById("booking-form");
        if (!form) return;

        const message = document.getElementById("message");

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const formData = new FormData(form);
            const patient_name = String(formData.get("patient_name") || "").trim();
            const appointment_date = String(formData.get("appointment_date") || "");
            const appointment_time = String(formData.get("appointment_time") || "");

            if (!patient_name || !appointment_date || !appointment_time) {
                message.textContent = "Please fill in all fields.";
                message.className = "message error";
                return;
            }

            const appointments = loadAppointments();
            const duplicate = appointments.some(
                (appt) =>
                    appt.appointment_date === appointment_date &&
                    appt.appointment_time === appointment_time
            );

            if (duplicate) {
                message.textContent = "This time slot is already booked.";
                message.className = "message error";
                return;
            }

            appointments.push({
                id: nextId(appointments),
                patient_name,
                appointment_date,
                appointment_time
            });

            saveAppointments(appointments);
            message.textContent = "Appointment booked successfully.";
            message.className = "message success";
            form.reset();
        });
    }

    function initAdminPage() {
        const tbody = document.getElementById("appointments-body");
        if (!tbody) return;

        const emptyState = document.getElementById("empty-state");

        function render() {
            const appointments = sortAppointments(loadAppointments());
            tbody.innerHTML = "";

            if (appointments.length === 0) {
                emptyState.style.display = "block";
                return;
            }

            emptyState.style.display = "none";

            appointments.forEach((appt) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${appt.id}</td>
                    <td>${appt.patient_name}</td>
                    <td>${appt.appointment_date}</td>
                    <td>${appt.appointment_time}</td>
                    <td class="table-actions">
                        <button class="btn btn-danger btn-sm" data-id="${appt.id}" type="button">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        tbody.addEventListener("click", function (event) {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            if (!target.matches("button[data-id]")) return;

            const id = Number(target.getAttribute("data-id"));
            if (!confirm("Delete this booking?")) return;

            const appointments = loadAppointments().filter((appt) => Number(appt.id) !== id);
            saveAppointments(appointments);
            render();
        });

        render();
    }

    initBookingPage();
    initAdminPage();
})();
