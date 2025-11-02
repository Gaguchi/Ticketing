import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AppContext";

interface Company {
  id: number;
  name: string;
  description?: string;
  ticket_count?: number;
  admin_count?: number;
  user_count?: number;
  admin_names?: string;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  availableCompanies: Company[];
  isITAdmin: boolean;
  hasCompanies: boolean;
  loading: boolean;
  setSelectedCompany: (company: Company | null) => void;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(
    null
  );
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [isITAdmin, setIsITAdmin] = useState<boolean>(false);
  const [hasCompanies, setHasCompanies] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Load companies from user data
  useEffect(() => {
    if (user) {
      const administeredCompanies = user.administered_companies || [];

      setAvailableCompanies(administeredCompanies);
      setIsITAdmin(user.is_it_admin || false);
      setHasCompanies(user.has_companies || false);

      // Auto-select first company if none selected
      if (!selectedCompany && administeredCompanies.length > 0) {
        const storedCompanyId = localStorage.getItem("selectedCompanyId");

        if (storedCompanyId) {
          const storedCompany = administeredCompanies.find(
            (c: Company) => c.id === parseInt(storedCompanyId)
          );
          if (storedCompany) {
            setSelectedCompanyState(storedCompany);
          } else {
            setSelectedCompanyState(administeredCompanies[0]);
          }
        } else {
          setSelectedCompanyState(administeredCompanies[0]);
        }
      }

      setLoading(false);
    } else {
      setAvailableCompanies([]);
      setSelectedCompanyState(null);
      setIsITAdmin(false);
      setHasCompanies(false);
      setLoading(false);
    }
  }, [user]);

  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
    if (company) {
      localStorage.setItem("selectedCompanyId", company.id.toString());
    } else {
      localStorage.removeItem("selectedCompanyId");
    }
  };

  const refreshCompanies = async () => {
    // This will be implemented when we need to refresh the company list
    // For now, it relies on the auth context updating the user
    setLoading(true);
    // Trigger a refresh from auth context if needed
    setLoading(false);
  };

  const value: CompanyContextType = {
    selectedCompany,
    availableCompanies,
    isITAdmin,
    hasCompanies,
    loading,
    setSelectedCompany,
    refreshCompanies,
  };

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
};
