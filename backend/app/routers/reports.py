from io import BytesIO, StringIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.reports import DoctorPerformanceReport, InventoryReport, PatientSummaryReport, RevenueReport
from app.services.reports_service import (
    doctor_performance_report,
    inventory_report,
    patient_summary_report,
    revenue_report,
)

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"], dependencies=[Depends(get_current_user)])


def csv_response(filename: str, rows: list[dict]) -> StreamingResponse:
    buffer = StringIO()
    dataframe = pd.DataFrame(rows or [{"message": "No data"}])
    dataframe.to_csv(buffer, index=False)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def excel_response(filename: str, rows: list[dict], sheet_name: str = "Report") -> StreamingResponse:
    buffer = BytesIO()
    dataframe = pd.DataFrame(rows or [{"message": "No data"}])
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        dataframe.to_excel(writer, index=False, sheet_name=sheet_name[:31])
        worksheet = writer.sheets[sheet_name[:31]]
        for column_cells in worksheet.columns:
            max_length = max(len(str(cell.value or "")) for cell in column_cells)
            worksheet.column_dimensions[column_cells[0].column_letter].width = min(max_length + 2, 40)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def revenue_chart(rows: list[dict]) -> BytesIO:
    row = rows[0] if rows else {}
    labels = ["Billing", "Pharmacy"]
    values = [float(row.get("billing_revenue") or 0), float(row.get("pharmacy_revenue") or 0)]
    figure, axis = plt.subplots(figsize=(5.5, 3))
    axis.bar(labels, values, color=["#2563eb", "#16a34a"])
    axis.set_title("Revenue Breakdown")
    axis.set_ylabel("Amount")
    axis.grid(axis="y", linestyle="--", alpha=0.35)
    figure.tight_layout()
    buffer = BytesIO()
    figure.savefig(buffer, format="png", dpi=150)
    plt.close(figure)
    buffer.seek(0)
    return buffer


def pdf_response(filename: str, title: str, rows: list[dict], chart: BytesIO | None = None) -> StreamingResponse:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    _, height = letter
    y = height - 72
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(72, y, title)
    pdf.setFont("Helvetica", 10)
    y -= 32
    if chart is not None:
        pdf.drawImage(ImageReader(chart), 72, y - 190, width=360, height=190, preserveAspectRatio=True, mask="auto")
        y -= 220
    for row in rows or [{"message": "No data"}]:
        for key, value in row.items():
            pdf.drawString(72, y, f"{key.replace('_', ' ').title()}: {value}")
            y -= 16
            if y < 72:
                pdf.showPage()
                y = height - 72
                pdf.setFont("Helvetica", 10)
        y -= 10
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/revenue", response_model=RevenueReport)
def read_revenue_report(export: str | None = Query(None), db: Session = Depends(get_db)):
    data = revenue_report(db)
    if export == "csv":
        return csv_response("revenue-report.csv", [data])
    if export == "xlsx":
        return excel_response("revenue-report.xlsx", [data], "Revenue")
    if export == "pdf":
        return pdf_response("revenue-report.pdf", "Revenue Report", [data], revenue_chart([data]))
    return data


@router.get("/patient-summary", response_model=PatientSummaryReport)
def read_patient_summary_report(export: str | None = Query(None), db: Session = Depends(get_db)):
    data = patient_summary_report(db)
    if export == "csv":
        return csv_response("patient-summary-report.csv", [data])
    if export == "xlsx":
        return excel_response("patient-summary-report.xlsx", [data], "Patient Summary")
    if export == "pdf":
        return pdf_response("patient-summary-report.pdf", "Patient Summary Report", [data])
    return data


@router.get("/doctor-performance", response_model=list[DoctorPerformanceReport])
def read_doctor_performance_report(export: str | None = Query(None), db: Session = Depends(get_db)):
    data = doctor_performance_report(db)
    if export == "csv":
        return csv_response("doctor-performance-report.csv", data)
    if export == "xlsx":
        return excel_response("doctor-performance-report.xlsx", data, "Doctor Performance")
    if export == "pdf":
        return pdf_response("doctor-performance-report.pdf", "Doctor Performance Report", data)
    return data


@router.get("/inventory-report", response_model=InventoryReport)
def read_inventory_report(export: str | None = Query(None), db: Session = Depends(get_db)):
    data = inventory_report(db)
    if export == "csv":
        return csv_response("inventory-report.csv", [data])
    if export == "xlsx":
        return excel_response("inventory-report.xlsx", [data], "Inventory")
    if export == "pdf":
        return pdf_response("inventory-report.pdf", "Inventory Report", [data])
    return data
