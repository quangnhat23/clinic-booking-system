from flask import Flask, render_template, request, redirect, url_for
import pymysql

app = Flask(__name__)

# Local MySQL connection settings
DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "letmein"
DB_NAME = "clinic_db"

def get_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/book", methods=["POST"])
def book():
    patient_name = request.form["patient_name"]
    appointment_date = request.form["appointment_date"]
    appointment_time = request.form["appointment_time"]

    conn = get_connection()
    cursor = conn.cursor()

    # check if time slot already exists
    cursor.execute(
        "SELECT * FROM appointments_new WHERE appointment_date=%s AND appointment_time=%s",
        (appointment_date, appointment_time)
    )
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return "This time slot is already booked. Go back and choose another time."

    cursor.execute(
        "INSERT INTO appointments_new (patient_name, appointment_date, appointment_time) VALUES (%s, %s, %s)",
        (patient_name, appointment_date, appointment_time)
    )
    conn.commit()
    conn.close()

    return redirect(url_for("admin"))

@app.route("/admin")
def admin():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments_new ORDER BY appointment_date, appointment_time")
    appointments = cursor.fetchall()
    conn.close()

    return render_template("admin.html", appointments=appointments)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)