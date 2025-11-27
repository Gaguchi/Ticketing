/**
 * CompanyFilterBar Component (Widget 1B)
 * Horizontal scrollable company filter with "All Tickets" as first card
 * Shows company logo/icon, name, and ticket count
 */

import React from "react";
import { Avatar, Badge, Tooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import type { CompanyHealth } from "../../types/dashboard";

interface Props {
  companies: CompanyHealth[];
  selectedCompanyId: number | null;
  totalTickets: number;
  onSelect: (companyId: number | null) => void;
  loading?: boolean;
}

const CompanyFilterBar: React.FC<Props> = ({
  companies,
  selectedCompanyId,
  totalTickets,
  onSelect,
  loading = false,
}) => {
  const isAllSelected = selectedCompanyId === null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 4,
        marginBottom: 16,
        scrollbarWidth: "thin",
      }}
    >
      {/* All Tickets Card */}
      <Tooltip title="View all tickets across all companies">
        <div
          onClick={() => onSelect(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderRadius: 8,
            backgroundColor: isAllSelected ? "#e6f4ff" : "#fff",
            border: isAllSelected ? "2px solid #1890ff" : "1px solid #e8e8e8",
            cursor: "pointer",
            minWidth: 160,
            flexShrink: 0,
            transition: "all 0.2s ease",
            boxShadow: isAllSelected
              ? "0 2px 8px rgba(24, 144, 255, 0.15)"
              : "0 1px 2px rgba(0, 0, 0, 0.03)",
          }}
          className="company-filter-card"
        >
          <Avatar
            size={40}
            style={{
              backgroundColor: isAllSelected ? "#1890ff" : "#f5f5f5",
              color: isAllSelected ? "#fff" : "#595959",
              flexShrink: 0,
            }}
          >
            <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: 16 }} />
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: isAllSelected ? "#1890ff" : "#262626",
                whiteSpace: "nowrap",
              }}
            >
              All Tickets
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#8c8c8c",
                whiteSpace: "nowrap",
              }}
            >
              {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </Tooltip>

      {/* Company Cards */}
      {companies.map((company) => {
        const isSelected = selectedCompanyId === company.id;
        const hasIssues =
          company.overdue_count > 0 || company.unassigned_count > 0;

        return (
          <Tooltip
            key={company.id}
            title={
              <div>
                <div>{company.name}</div>
                {company.overdue_count > 0 && (
                  <div style={{ color: "#ff4d4f" }}>
                    {company.overdue_count} overdue
                  </div>
                )}
                {company.unassigned_count > 0 && (
                  <div style={{ color: "#faad14" }}>
                    {company.unassigned_count} unassigned
                  </div>
                )}
              </div>
            }
          >
            <Badge
              count={
                hasIssues ? company.overdue_count + company.unassigned_count : 0
              }
              size="small"
              offset={[-8, 8]}
            >
              <div
                onClick={() => onSelect(company.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  borderRadius: 8,
                  backgroundColor: isSelected ? "#e6f4ff" : "#fff",
                  border: isSelected
                    ? "2px solid #1890ff"
                    : hasIssues
                    ? "1px solid #ff4d4f40"
                    : "1px solid #e8e8e8",
                  cursor: "pointer",
                  minWidth: 140,
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                  boxShadow: isSelected
                    ? "0 2px 8px rgba(24, 144, 255, 0.15)"
                    : "0 1px 2px rgba(0, 0, 0, 0.03)",
                }}
                className="company-filter-card"
              >
                <Avatar
                  size={40}
                  src={company.logo_thumbnail_url || company.logo_url}
                  shape="square"
                  style={{
                    backgroundColor: "transparent",
                    flexShrink: 0,
                    borderRadius: 0,
                  }}
                >
                  {!company.logo_url && (
                    <FontAwesomeIcon
                      icon={faBuilding}
                      style={{
                        fontSize: 16,
                        color: isSelected ? "#fff" : "#595959",
                      }}
                    />
                  )}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: isSelected ? "#1890ff" : "#262626",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 120,
                    }}
                  >
                    {company.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8c8c8c",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {company.total_tickets} ticket
                    {company.total_tickets !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </Badge>
          </Tooltip>
        );
      })}

      <style>
        {`
          .company-filter-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
          }
        `}
      </style>
    </div>
  );
};

export default CompanyFilterBar;
