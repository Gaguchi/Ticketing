import { useState, useEffect, useCallback } from "react";
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";
import type { CompanyStats } from "../components/companies/CompanyCard";

interface UseCompanyStatsOptions {
  companyId: number;
  projectId?: number | null;
  enabled?: boolean;
}

interface UseCompanyStatsResult {
  stats: CompanyStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCompanyStats({
  companyId,
  projectId,
  enabled = true,
}: UseCompanyStatsOptions): UseCompanyStatsResult {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!enabled || !companyId) return;

    setLoading(true);
    setError(null);

    try {
      let url = API_ENDPOINTS.COMPANY_STATS(companyId);
      if (projectId) {
        url += `?project=${projectId}`;
      }
      const data = await apiService.get<CompanyStats>(url);
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch company stats");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, projectId, enabled]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

// Hook to fetch stats for multiple companies at once
interface UseCompaniesStatsOptions {
  companyIds: number[];
  projectId?: number | null;
  enabled?: boolean;
}

interface UseCompaniesStatsResult {
  statsMap: Map<number, CompanyStats>;
  loadingMap: Map<number, boolean>;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useCompaniesStats({
  companyIds,
  projectId,
  enabled = true,
}: UseCompaniesStatsOptions): UseCompaniesStatsResult {
  const [statsMap, setStatsMap] = useState<Map<number, CompanyStats>>(new Map());
  const [loadingMap, setLoadingMap] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchAllStats = useCallback(async () => {
    if (!enabled || companyIds.length === 0) return;

    setLoading(true);
    
    // Set all companies to loading
    const newLoadingMap = new Map<number, boolean>();
    companyIds.forEach((id) => newLoadingMap.set(id, true));
    setLoadingMap(newLoadingMap);

    const newStatsMap = new Map<number, CompanyStats>();

    // Fetch stats in parallel (with a small batch limit to avoid overwhelming the server)
    const batchSize = 5;
    for (let i = 0; i < companyIds.length; i += batchSize) {
      const batch = companyIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (companyId) => {
          try {
            let url = API_ENDPOINTS.COMPANY_STATS(companyId);
            if (projectId) {
              url += `?project=${projectId}`;
            }
            const data = await apiService.get<CompanyStats>(url);
            newStatsMap.set(companyId, data);
          } catch {
            // Silently fail for individual company stats
            console.warn(`Failed to fetch stats for company ${companyId}`);
          } finally {
            setLoadingMap((prev) => {
              const updated = new Map(prev);
              updated.set(companyId, false);
              return updated;
            });
          }
        })
      );
    }

    setStatsMap(newStatsMap);
    setLoading(false);
  }, [companyIds, projectId, enabled]);

  useEffect(() => {
    fetchAllStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyIds.join(","), projectId, enabled]);

  return {
    statsMap,
    loadingMap,
    loading,
    refetch: fetchAllStats,
  };
}

export default useCompanyStats;
