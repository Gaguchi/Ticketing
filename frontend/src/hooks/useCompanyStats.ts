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

    try {
      // Single bulk request instead of N individual requests
      let url = API_ENDPOINTS.COMPANY_BULK_STATS;
      if (projectId) {
        url += `?project=${projectId}`;
      }

      const data = await apiService.get<
        Array<CompanyStats & { company_id: number }>
      >(url);

      const newStatsMap = new Map<number, CompanyStats>();
      for (const item of data) {
        newStatsMap.set(item.company_id, {
          open_tickets: item.open_tickets,
          urgent_tickets: item.urgent_tickets,
          overdue_tickets: item.overdue_tickets,
          resolved_this_month: item.resolved_this_month,
          total_tickets: item.total_tickets,
          user_count: item.user_count,
          admin_count: item.admin_count,
          health_status: item.health_status,
          last_activity: item.last_activity,
        });
      }
      setStatsMap(newStatsMap);
    } catch {
      console.warn("Failed to fetch bulk company stats");
    } finally {
      // Clear all loading states
      const clearedMap = new Map<number, boolean>();
      companyIds.forEach((id) => clearedMap.set(id, false));
      setLoadingMap(clearedMap);
      setLoading(false);
    }
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
