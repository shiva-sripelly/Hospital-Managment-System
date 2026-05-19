from sqlalchemy import inspect, text

from app.database import engine


def column_names(table_name: str) -> set[str]:
    inspector = inspect(engine)
    return {column["name"] for column in inspector.get_columns(table_name, schema="public")}


def run() -> None:
    print("starting schema sync", flush=True)
    user_columns = column_names("users")
    patient_columns = column_names("patients")

    with engine.begin() as connection:
        print("connected", flush=True)
        connection.execute(text("SET lock_timeout = '5s'"))
        connection.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'patient'"))
        connection.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lab_technician'"))
        connection.execute(
            text(
                "DO $$ BEGIN "
                "CREATE TYPE lab_test_status AS ENUM "
                "('requested', 'sample_collected', 'in_progress', 'completed', 'cancelled'); "
                "EXCEPTION WHEN duplicate_object THEN NULL; "
                "END $$;"
            )
        )
        connection.execute(
            text(
                "CREATE TABLE IF NOT EXISTS lab_tests ("
                "id SERIAL PRIMARY KEY, "
                "patient_id INTEGER NOT NULL REFERENCES patients(id), "
                "doctor_id INTEGER NOT NULL REFERENCES doctors(id), "
                "test_name VARCHAR(120) NOT NULL, "
                "test_status lab_test_status NOT NULL DEFAULT 'requested', "
                "report_file VARCHAR(255), "
                "remarks TEXT, "
                "created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()"
                ")"
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_lab_tests_id ON lab_tests (id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_lab_tests_patient_id ON lab_tests (patient_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_lab_tests_doctor_id ON lab_tests (doctor_id)"))
        connection.execute(
            text(
                "CREATE TABLE IF NOT EXISTS medical_records ("
                "id SERIAL PRIMARY KEY, "
                "patient_id INTEGER NOT NULL REFERENCES patients(id), "
                "file_name VARCHAR(255) NOT NULL, "
                "file_type VARCHAR(80) NOT NULL, "
                "file_path VARCHAR(500) NOT NULL, "
                "uploaded_by INTEGER NOT NULL REFERENCES users(id), "
                "created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()"
                ")"
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_medical_records_id ON medical_records (id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_medical_records_patient_id ON medical_records (patient_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_medical_records_file_type ON medical_records (file_type)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_medical_records_uploaded_by ON medical_records (uploaded_by)"))
        connection.execute(
            text(
                "DO $$ BEGIN "
                "CREATE TYPE notification_type AS ENUM "
                "('info', 'billing', 'prescription', 'lab', 'medical_record', 'appointment'); "
                "EXCEPTION WHEN duplicate_object THEN NULL; "
                "END $$;"
            )
        )
        connection.execute(
            text(
                "CREATE TABLE IF NOT EXISTS notifications ("
                "id SERIAL PRIMARY KEY, "
                "user_id INTEGER NOT NULL REFERENCES users(id), "
                "title VARCHAR(120) NOT NULL, "
                "message TEXT NOT NULL, "
                "notification_type notification_type NOT NULL DEFAULT 'info', "
                "is_read BOOLEAN NOT NULL DEFAULT false, "
                "created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()"
                ")"
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_id ON notifications (id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id)"))
        print("users columns checked", flush=True)
        if "profile_photo_url" not in user_columns:
            print("adding profile_photo_url", flush=True)
            connection.execute(text("ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500)"))
            user_columns.add("profile_photo_url")
        if "hashed_password" in user_columns and "password_hash" not in user_columns:
            print("renaming hashed_password", flush=True)
            connection.execute(text("ALTER TABLE users RENAME COLUMN hashed_password TO password_hash"))

        print("patients columns checked", flush=True)
        if "date_of_birth" in patient_columns and "dob" not in patient_columns:
            print("renaming dob", flush=True)
            connection.execute(text("ALTER TABLE patients RENAME COLUMN date_of_birth TO dob"))
            patient_columns.remove("date_of_birth")
            patient_columns.add("dob")

        if "full_name" not in patient_columns:
            print("adding full_name", flush=True)
            connection.execute(text("ALTER TABLE patients ADD COLUMN full_name VARCHAR(120)"))
            patient_columns.add("full_name")
            connection.execute(
                text(
                    "UPDATE patients SET full_name = trim(concat_ws(' ', first_name, last_name)) "
                    "WHERE full_name IS NULL"
                )
            )

        if "emergency_contact" not in patient_columns:
            print("adding emergency_contact", flush=True)
            connection.execute(text("ALTER TABLE patients ADD COLUMN emergency_contact VARCHAR(120)"))
            patient_columns.add("emergency_contact")
            connection.execute(
                text(
                    "UPDATE patients SET emergency_contact = nullif(trim(concat_ws(' ', "
                    "emergency_contact_name, emergency_contact_phone)), '') "
                    "WHERE emergency_contact IS NULL"
                )
            )

        print("dropping old not null constraints", flush=True)
        connection.execute(text("ALTER TABLE patients ALTER COLUMN full_name SET NOT NULL"))

        print("dropping obsolete columns", flush=True)
        connection.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS updated_at"))
        connection.execute(text("ALTER TABLE patients DROP COLUMN IF EXISTS first_name"))
        connection.execute(text("ALTER TABLE patients DROP COLUMN IF EXISTS last_name"))
        connection.execute(text("ALTER TABLE patients DROP COLUMN IF EXISTS emergency_contact_name"))
        connection.execute(text("ALTER TABLE patients DROP COLUMN IF EXISTS emergency_contact_phone"))
        connection.execute(text("ALTER TABLE patients DROP COLUMN IF EXISTS medical_history"))
        connection.execute(text("ALTER TABLE patients DROP COLUMN IF EXISTS allergies"))
        connection.execute(text("ALTER TABLE patients DROP COLUMN IF EXISTS user_id"))
        connection.execute(text("ALTER TABLE patients DROP COLUMN IF EXISTS updated_at"))

    inspector = inspect(engine)
    print(inspector.get_table_names(schema="public"))
    print({table: [column["name"] for column in inspector.get_columns(table, schema="public")] for table in inspector.get_table_names(schema="public")})


if __name__ == "__main__":
    run()
