/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Fragment, useState } from 'react';
import {
  EuiLink,
  EuiInMemoryTable,
  EuiSmallButtonEmpty,
  EuiSmallButton,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { humanReadableDate } from './main_utils';
import { ResourceSharingModal } from './resource_sharing_modal';
import { HttpSetup } from '../../../../../src/core/public';
import {
  REPORT_DEFINITION_RESOURCE_TYPE,
  ResourceSharingConfig,
  SharePermissionMap,
  getAccessLevelsForType,
  supportsResourceSharingForType,
} from './resource_sharing_utils';

interface ReportDefinitionRow {
  id: string;
  reportName: string;
  source: string;
  baseUrl: string;
  type: string;
  details: string;
  lastUpdated: string | number | Date;
  status: string;
}

interface ReportDefinitionsProps {
  pagination: Record<string, unknown>;
  reportDefinitionsTableContent: ReportDefinitionRow[];
  httpClient: HttpSetup;
  resourceSharingConfig: ResourceSharingConfig;
  sharePermissions: SharePermissionMap;
  handleResourceSharingSuccessToast: () => void;
}

const emptyMessageReportDefinitions = (
  <EuiEmptyPrompt
    title={
      <h3>
        {i18n.translate(
          'opensearch.reports.reportDefinitionsTable.emptyMessageReports.noReportDefinitions',
          { defaultMessage: 'No report definitions to display' }
        )}
      </h3>
    }
    titleSize="xs"
    body={
      <div>
        <EuiText>
          {i18n.translate(
            'opensearch.reports.reportDefinitionsTable.emptyMessageReports.createANewDefinition',
            { defaultMessage: 'Create a new report definition to get started' }
          )}
        </EuiText>
        <EuiText>
          {i18n.translate(
            'opensearch.reports.reportDefinitionsTable.emptyMessageReports.toLearnMore',
            { defaultMessage: 'To learn more, see' }
          )}{' '}
          <EuiLink
            href="https://opensearch.org/docs/dashboards/reporting/"
            target="_blank"
          >
            {i18n.translate(
              'opensearch.reports.reportDefinitionsTable.emptyMessageReports.getStarted',
              {
                defaultMessage:
                  'Get started with OpenSearch Dashboards reporting',
              }
            )}
          </EuiLink>
        </EuiText>
      </div>
    }
    actions={
      <div>
        <EuiSmallButton
          onClick={() => {
            window.location.assign('reports-dashboards#/create');
          }}
        >
          {i18n.translate(
            'opensearch.reports.reportDefinitionsTable.emptyMessageReports.createReportDefinition',
            { defaultMessage: 'Create report definition' }
          )}
        </EuiSmallButton>
      </div>
    }
  />
);

const reportDefinitionsSearch = {
  box: {
    incremental: true,
    compressed: true,
  },
  filters: [],
};

export function ReportDefinitions(props: ReportDefinitionsProps) {
  const {
    pagination,
    reportDefinitionsTableContent,
    httpClient,
    resourceSharingConfig,
    sharePermissions,
    handleResourceSharingSuccessToast,
  } = props;

  const sortField = 'lastUpdated';
  const sortDirection = 'des';
  const [
    selectedReportDefinition,
    setSelectedReportDefinition,
  ] = useState<ReportDefinitionRow | null>(null);

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const getDefinitionTableItemId = (name) => {
    for (
      let index = 0;
      index < props.reportDefinitionsTableContent.length;
      ++index
    ) {
      if (name === reportDefinitionsTableContent[index].reportName) {
        return reportDefinitionsTableContent[index].id;
      }
    }
  };

  const navigateToDefinitionDetails = (name: string) => {
    const id = getDefinitionTableItemId(name);
    window.location.assign(
      `reports-dashboards#/report_definition_details/${id}`
    );
  };

  const reportDefinitionsColumns = [
    {
      field: 'reportName',
      name: i18n.translate(
        'opensearch.reports.reportDefinitionsTable.columns.name',
        {
          defaultMessage: 'Name',
        }
      ),
      render: (name) => (
        <EuiLink
          onClick={() => navigateToDefinitionDetails(name)}
          id={'reportDefinitionDetailsLink'}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'source',
      name: i18n.translate(
        'opensearch.reports.reportDefinitionsTable.columns.source',
        { defaultMessage: 'Source' }
      ),
      render: (value, item) => (
        <EuiLink href={item.baseUrl} target="_blank">
          {value}
        </EuiLink>
      ),
    },
    {
      field: 'type',
      name: i18n.translate(
        'opensearch.reports.reportDefinitionsTable.columns.type',
        {
          defaultMessage: 'Type',
        }
      ),
      sortable: true,
      truncateText: false,
    },
    {
      field: 'details',
      name: i18n.translate(
        'opensearch.reports.reportDefinitionsTable.columns.scheduleDetails',
        { defaultMessage: 'Schedule details' }
      ),
      sortable: false,
      truncateText: true,
    },
    {
      field: 'lastUpdated',
      name: i18n.translate(
        'opensearch.reports.reportDefinitionsTable.columns.lastUpdated',
        { defaultMessage: 'Last Updated' }
      ),
      render: (date) => {
        const readable = humanReadableDate(date);
        return <EuiText size="s">{readable}</EuiText>;
      },
    },
    {
      field: 'status',
      name: i18n.translate(
        'opensearch.reports.reportDefinitionsTable.columns.status',
        { defaultMessage: 'Status' }
      ),
      sortable: true,
      truncateText: false,
    },
  ];

  const reportDefinitionAccessLevels = getAccessLevelsForType(
    resourceSharingConfig,
    REPORT_DEFINITION_RESOURCE_TYPE
  );

  if (
    supportsResourceSharingForType(
      resourceSharingConfig,
      REPORT_DEFINITION_RESOURCE_TYPE
    )
  ) {
    reportDefinitionsColumns.push({
      name: i18n.translate(
        'opensearch.reports.reportDefinitionsTable.columns.share',
        { defaultMessage: 'Share' }
      ),
      render: (item) => {
        const canShare = sharePermissions[item.id] === true;

        return (
          <EuiSmallButtonEmpty
            iconType="share"
            onClick={() => canShare && setSelectedReportDefinition(item)}
            disabled={!canShare}
            title={
              canShare
                ? undefined
                : i18n.translate(
                    'opensearch.reports.reportDefinitionsTable.columns.shareButtonDisabledTooltip',
                    {
                      defaultMessage:
                        'You do not have permission to share this report definition.',
                    }
                  )
            }
            data-test-subj={`reportDefinitionShareButton-${item.id}`}
          >
            {i18n.translate(
              'opensearch.reports.reportDefinitionsTable.columns.shareButtonLabel',
              { defaultMessage: 'Share' }
            )}
          </EuiSmallButtonEmpty>
        );
      },
    });
  }

  const displayMessage =
    reportDefinitionsTableContent.length === 0
      ? emptyMessageReportDefinitions
      : i18n.translate(
          'opensearch.reports.reportDefinitionsTable.emptyMessageReports.noDefinitionsFound',
          {
            defaultMessage:
              '0 report definitions match the search criteria. Search again.',
          }
        );

  return (
    <Fragment>
      <EuiInMemoryTable
        items={reportDefinitionsTableContent}
        itemId="id"
        loading={false}
        message={displayMessage}
        columns={reportDefinitionsColumns}
        search={reportDefinitionsSearch}
        pagination={pagination}
        sorting={sorting}
        isSelectable={true}
        tableLayout={'auto'}
      />
      {selectedReportDefinition && (
        <ResourceSharingModal
          isOpen={true}
          onClose={() => setSelectedReportDefinition(null)}
          onSaveSuccess={handleResourceSharingSuccessToast}
          httpClient={httpClient}
          resourceId={selectedReportDefinition.id}
          resourceName={selectedReportDefinition.reportName}
          resourceType={REPORT_DEFINITION_RESOURCE_TYPE}
          resourceLabel={i18n.translate(
            'opensearch.reports.reportDefinitionsTable.resourceLabel',
            { defaultMessage: 'report definition' }
          )}
          accessLevels={reportDefinitionAccessLevels}
        />
      )}
    </Fragment>
  );
}
