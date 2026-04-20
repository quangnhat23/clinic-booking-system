from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)



# In-memory storage for appointments
appointments = []
next_id = 1

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/book", methods=["POST"])
def book():
    patient_name = request.form["patient_name"]
    appointment_date = request.form["appointment_date"]
    appointment_time = request.form["appointment_time"]

    global next_id
    # Check if time slot already exists
    for appt in appointments:
        if appt['appointment_date'] == appointment_date and appt['appointment_time'] == appointment_time:
            return "This time slot is already booked. Go back and choose another time."

    # Add new appointment
    appointments.append({
        'id': next_id,
        'patient_name': patient_name,
        'appointment_date': appointment_date,
        'appointment_time': appointment_time
    })
    next_id += 1
    return redirect(url_for("admin"))

@app.route("/admin")
def admin():
    # Sort appointments by date and time
    sorted_appointments = sorted(appointments, key=lambda x: (x['appointment_date'], x['appointment_time']))
    return render_template("admin.html", appointments=sorted_appointments)


@app.route("/admin/delete/<int:appointment_id>", methods=["POST"])
def delete_appointment(appointment_id):
    global appointments
    appointments = [appt for appt in appointments if appt['id'] != appointment_id]
    return redirect(url_for("admin"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)