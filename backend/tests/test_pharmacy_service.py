import os
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: E402,F401
from app.database import Base  # noqa: E402
from app.models.patient import Gender, Patient  # noqa: E402
from app.models.pharmacy import Medicine, MedicineSale  # noqa: E402
from app.schemas.pharmacy import MedicineSaleCreate, MedicineSaleItemCreate  # noqa: E402
from app.services.pharmacy_service import create_sale  # noqa: E402


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def add_patient(session) -> Patient:
    patient = Patient(
        patient_code="PAT-000001",
        full_name="Test Patient",
        gender=Gender.other,
        dob=date(1990, 1, 1),
        phone="9999999999",
    )
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient


def add_medicine(session, stock_quantity: int) -> Medicine:
    medicine = Medicine(
        medicine_code="MED-000001",
        medicine_name="Paracetamol",
        category="Tablet",
        stock_quantity=stock_quantity,
        unit_price=Decimal("5.00"),
    )
    session.add(medicine)
    session.commit()
    session.refresh(medicine)
    return medicine


def test_create_sale_aggregates_duplicate_items_before_reducing_stock(db_session):
    patient = add_patient(db_session)
    medicine = add_medicine(db_session, stock_quantity=5)

    sale = create_sale(
        db_session,
        MedicineSaleCreate(
            patient_id=patient.id,
            items=[
                MedicineSaleItemCreate(medicine_id=medicine.id, quantity=2),
                MedicineSaleItemCreate(medicine_id=medicine.id, quantity=3),
            ],
        ),
    )

    db_session.refresh(medicine)
    assert sale.total_amount == Decimal("25.00")
    assert medicine.stock_quantity == 0


def test_create_sale_rolls_back_when_duplicate_items_exceed_stock(db_session):
    patient = add_patient(db_session)
    medicine = add_medicine(db_session, stock_quantity=4)

    with pytest.raises(ValueError, match="Insufficient stock"):
        create_sale(
            db_session,
            MedicineSaleCreate(
                patient_id=patient.id,
                items=[
                    MedicineSaleItemCreate(medicine_id=medicine.id, quantity=2),
                    MedicineSaleItemCreate(medicine_id=medicine.id, quantity=3),
                ],
            ),
        )

    db_session.refresh(medicine)
    assert medicine.stock_quantity == 4
    assert db_session.query(MedicineSale).count() == 0
