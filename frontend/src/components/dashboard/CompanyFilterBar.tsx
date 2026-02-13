/**
 * CompanyFilterBar Component
 * Compact horizontal company filter with pill-style buttons
 * Reusable across Dashboard, Tickets, and Chat pages
 */

import React from "react";
import { Avatar, Badge, Tooltip, Tag } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import type { CompanyHealth } from "../../types/dashboard";

interface Props {
  companies: CompanyHealth[];
  selectedCompanyIds: number[];
  totalTickets?: number;
  onToggle: (companyId: number) => void;
  onClearAll: () => void;
  loading?: boolean;
  /** Compact mode for embedding in page headers */
  compact?: boolean;
}

const CompanyFilterBar: React.FC<Props> = ({
  companies,
  selectedCompanyIds,
  totalTickets = 0,
  onToggle,
  onClearAll,
  loading: _loading = false,
  compact = false,
}) => {
  const { t } = useTranslation('dashboard');
  const isAllSelected = selectedCompanyIds.length === 0;

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
          onClick={() => onClearAll()}
          style={{
            cursor: "pointer",
            margin: 0,
            padding: "4px 12px",
            borderRadius: 4,
            backgroundColor: isAllSelected ? "var(--color-primary)" : "var(--color-bg-sidebar)",
            color: isAllSelected ? "#fff" : "var(--color-text-secondary)",
            border: isAllSelected ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
            fontWeight: isAllSelected ? 600 : 400,
            fontSize: 12,
            transition: "all 0.2s",
          }}
        >
          {t('filter.all')} {totalTickets > 0 && `(${totalTickets})`}
        </Tag>

        {/* Company pills */}
        {companies.map((company) => {
          const isSelected = selectedCompanyIds.includes(company.id);
          const hasIssues = company.overdue_count > 0;

          return (
            <Tooltip
              key={company.id}
              title={
                <div style={{ fontSize: 11 }}>
                  <div style={{ fontWeight: 600 }}>{company.name}</div>
                  <div>{t('company.tickets', { count: company.total_tickets })}</div>
                  {company.overdue_count > 0 && (
                    <div style={{ color: "#ff7875" }}>
                      {t('company.overdue', { count: company.overdue_count })}
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
                  onClick={() => onToggle(company.id)}
                  style={{
                    cursor: "pointer",
                    margin: 0,
                    padding: "4px 10px",
                    paddingLeft: company.logo_url ? 4 : 10,
                    borderRadius: 4,
                    backgroundColor: isSelected ? "var(--color-primary)" : "var(--color-bg-sidebar)",
                    color: isSelected ? "#fff" : "var(--color-text-secondary)",
                    border: isSelected ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
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
      <Tooltip title={t('filter.viewAllTickets')}>
        <div
          onClick={() => onClearAll()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 6,
            backgroundColor: isAllSelected ? "var(--color-primary-light)" : "var(--color-bg-surface)",
            border: isAllSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
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
              backgroundColor: isAllSelected ? "var(--color-primary)" : "var(--color-border-light)",
              color: isAllSelected ? "#fff" : "var(--color-text-secondary)",
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
                color: isAllSelected ? "var(--color-primary)" : "var(--color-text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              {t('filter.allTickets')}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--color-text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {t('filter.total', { count: totalTickets })}
            </div>
          </div>
        </div>
      </Tooltip>

      {/* Company Cards */}
      {companies.map((company) => {
        const isSelected = selectedCompanyIds.includes(company.id);
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
                    {t('company.overdue', { count: company.overdue_count })}
                  </div>
                )}
                {company.unassigned_count > 0 && (
                  <div style={{ color: "#faad14" }}>
                    {t('company.unassigned', { count: company.unassigned_count })}
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
                onClick={() => onToggle(company.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 6,
                  backgroundColor: isSelected ? "var(--color-primary-light)" : "var(--color-bg-surface)",
                  border: isSelected
                    ? "2px solid var(--color-primary)"
                    : hasIssues
                    ? "1px solid #ff4d4f40"
                    : "1px solid var(--color-border)",
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
                        color: "var(--color-text-secondary)",
                      }}
                    />
                  )}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: isSelected ? "var(--color-primary)" : "var(--color-text-primary)",
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
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t('company.tickets', { count: company.total_tickets })}
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
