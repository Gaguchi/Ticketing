/**
 * CompanyFilterBar Component
 * Compact horizontal company filter with pill-style buttons
 * Reusable across Dashboard, Tickets, and Chat pages
 */

import React from "react";
import { Avatar, Badge, Tooltip, Tag } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import type { CompanyHealth } from "../../types/dashboard";

interface Props {
  companies: CompanyHealth[];
  selectedCompanyId: number | null;
  totalTickets?: number;
  onSelect: (companyId: number | null) => void;
  loading?: boolean;
  /** Compact mode for embedding in page headers */
  compact?: boolean;
}

const CompanyFilterBar: React.FC<Props> = ({
  companies,
  selectedCompanyId,
  totalTickets = 0,
  onSelect,
  loading: _loading = false,
  compact = false,
}) => {
  const isAllSelected = selectedCompanyId === null;

  // Compact pill style
  if (compact) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {/* All option */}
        <Tag
          onClick={() => onSelect(null)}
          style={{
            cursor: "pointer",
            margin: 0,
            padding: "4px 12px",
            borderRadius: 16,
            backgroundColor: isAllSelected ? "#1890ff" : "#fafafa",
            color: isAllSelected ? "#fff" : "#595959",
            border: isAllSelected ? "1px solid #1890ff" : "1px solid #d9d9d9",
            fontWeight: isAllSelected ? 600 : 400,
            fontSize: 12,
            transition: "all 0.2s",
          }}
        >
          All {totalTickets > 0 && `(${totalTickets})`}
        </Tag>

        {/* Company pills */}
        {companies.map((company) => {
          const isSelected = selectedCompanyId === company.id;
          const hasIssues = company.overdue_count > 0;

          return (
            <Tooltip
              key={company.id}
              title={
                <div style={{ fontSize: 11 }}>
                  <div style={{ fontWeight: 600 }}>{company.name}</div>
                  <div>{company.total_tickets} tickets</div>
                  {company.overdue_count > 0 && (
                    <div style={{ color: "#ff7875" }}>
                      {company.overdue_count} overdue
                    </div>
                  )}
                </div>
              }
            >
              <Badge
                dot={hasIssues}
                offset={[-4, 4]}
                color="#ff4d4f"
              >
                <Tag
                  onClick={() => onSelect(company.id)}
                  style={{
                    cursor: "pointer",
                    margin: 0,
                    padding: "4px 10px",
                    paddingLeft: company.logo_url ? 4 : 10,
                    borderRadius: 16,
                    backgroundColor: isSelected ? "#1890ff" : "#fafafa",
                    color: isSelected ? "#fff" : "#595959",
                    border: isSelected ? "1px solid #1890ff" : "1px solid #d9d9d9",
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s",
                  }}
                >
                  {company.logo_url ? (
                    <Avatar
                      size={18}
                      src={company.logo_thumbnail_url || company.logo_url}
                      style={{ flexShrink: 0 }}
                    />
                  ) : null}
                  <span
                    style={{
                      maxWidth: 80,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {company.name}
                  </span>
                </Tag>
              </Badge>
            </Tooltip>
          );
        })}

        <style>
          {`
            .ant-tag:hover {
              opacity: 0.85;
            }
          `}
        </style>
      </div>
    );
  }

  // Original card-based layout for Dashboard
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        overflowX: "auto",
        paddingTop: 4,
        scrollbarWidth: "thin",
      }}
    >
      {/* All Tickets Card */}
      <Tooltip title="View all tickets">
        <div
          onClick={() => onSelect(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 6,
            backgroundColor: isAllSelected ? "#e6f4ff" : "#fff",
            border: isAllSelected ? "2px solid #1890ff" : "1px solid #e8e8e8",
            cursor: "pointer",
            minWidth: 130,
            flexShrink: 0,
            transition: "all 0.2s ease",
            boxShadow: isAllSelected
              ? "0 2px 6px rgba(24, 144, 255, 0.12)"
              : "0 1px 2px rgba(0, 0, 0, 0.03)",
          }}
          className="company-filter-card"
        >
          <Avatar
            size={32}
            style={{
              backgroundColor: isAllSelected ? "#1890ff" : "#f0f0f0",
              color: isAllSelected ? "#fff" : "#595959",
              flexShrink: 0,
            }}
          >
            <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: 14 }} />
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: isAllSelected ? "#1890ff" : "#262626",
                whiteSpace: "nowrap",
              }}
            >
              All Tickets
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#8c8c8c",
                whiteSpace: "nowrap",
              }}
            >
              {totalTickets} total
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
              offset={[-6, 6]}
            >
              <div
                onClick={() => onSelect(company.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 6,
                  backgroundColor: isSelected ? "#e6f4ff" : "#fff",
                  border: isSelected
                    ? "2px solid #1890ff"
                    : hasIssues
                    ? "1px solid #ff4d4f40"
                    : "1px solid #e8e8e8",
                  cursor: "pointer",
                  minWidth: 120,
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                  boxShadow: isSelected
                    ? "0 2px 6px rgba(24, 144, 255, 0.12)"
                    : "0 1px 2px rgba(0, 0, 0, 0.03)",
                }}
                className="company-filter-card"
              >
                <Avatar
                  size={32}
                  src={company.logo_thumbnail_url || company.logo_url}
                  shape="square"
                  style={{
                    backgroundColor: "transparent",
                    flexShrink: 0,
                    borderRadius: 4,
                  }}
                >
                  {!company.logo_url && (
                    <FontAwesomeIcon
                      icon={faBuilding}
                      style={{
                        fontSize: 14,
                        color: "#595959",
                      }}
                    />
                  )}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: isSelected ? "#1890ff" : "#262626",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 100,
                    }}
                  >
                    {company.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#8c8c8c",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {company.total_tickets} tickets
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
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06) !important;
          }
        `}
      </style>
    </div>
  );
};

export default CompanyFilterBar;
