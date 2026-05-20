import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { aiService } from "../services/aiService";

export default function AIInsightsPage() {
  const [risks, setRisks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const columns = useMemo(() => [
    { key: "patient_name", label: "Patient" },
    { key: "risk_level", label: "Risk", render: (row) => <span className="capitalize">{row.risk_level}</span> },
    { key: "risk_score", label: "Score" },
    { key: "reasons", label: "Signals", render: (row) => row.reasons.join(", ") }
  ], []);

  useEffect(() => {
    async function loadInsights() {
      setLoading(true);
      try {
        const [riskResponse, recommendationResponse] = await Promise.all([
          aiService.patientRisk(),
          aiService.recommendations()
        ]);
        setRisks(riskResponse.data.map((row) => ({ ...row, id: row.patient_id })));
        setRecommendations(recommendationResponse.data.map((row, index) => ({ ...row, id: index + 1 })));
      } catch (error) {
        showToast(getApiError(error, "Failed to load AI insights"), "error");
      } finally {
        setLoading(false);
      }
    }
    loadInsights();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="AI Insights Dashboard" description="Patient risk signals and smart operational recommendations." />
      {loading ? <LoadingSpinner label="Loading AI insights" /> : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {recommendations.map((item) => (
              <div key={item.id} className="panel p-4">
                <h2 className="text-sm font-bold text-slate-950 dark:text-slate-50">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
          <DataTable columns={columns} data={risks} emptyText="No patient insights found" />
        </>
      )}
    </div>
  );
}
