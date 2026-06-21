/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Fragment, useState } from 'react';
import { i18n } from '@osd/i18n';
import {
  // @ts-ignore
  EuiLink,
  EuiText,
  EuiIcon,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiSmallButtonEmpty,
} from '@elastic/eui';
import {
  fileFormatsUpper,
  humanReadableDate,
  generateReportById,
} from './main_utils';
import { GenerateReportLoadingModal } from './loading_modal';
import { HttpSetup } from '../../../../../src/core/public';
import { ResourceSharingModal } from './resource_sharing_modal';
import {
  REPORT_INSTANCE_RESOURCE_TYPE,
  ResourceSharingConfig,
  SharePermissionMap,
  getAccessLevelsForType,
  supportsResourceSharingForType,
} from './resource_sharing_utils';

interface ReportRow {
  id: string;
  reportName: string;
  reportSource: string;
  url: string;
  type: string;
  timeCreated: string | number | Date;
  state: string;
  format: string;
}

interface ReportsTableProps {
  pagination: Record<string, unknown>;
  reportsTableItems: ReportRow[];
  httpClient: HttpSetup;
  handleSuccessToast: () => void;
  handleErrorToast: (title?: string, text?: string) => void;
  handlePermissionsMissingToast: () => void;
  resourceSharingConfig: ResourceSharingConfig;
  sharePermissions: SharePermissionMap;
  handleResourceSharingSuccessToast: () => void;
}

const reportStatusOptions = [
  'Created',
  'Error',
  'Pending',
  'Shared',
  'Archived',
];
const reportTypeOptions = ['Schedule', 'On demand'];

const emptyMessageReports = (
  <EuiEmptyPrompt
    title={
      <h3>
        {i18n.translate(
          'opensearch.reports.reportsTable.emptyMessageReports.noReportsToDisplay',
          { defaultMessage: 'No reports to display' }
        )}
      </h3>
    }
    titleSize="xs"
    body={
      <div>
        <EuiText>
          {i18n.translate(
            'opensearch.reports.reportsTable.emptyMessageReports.createAReportDefinition',
            {
              defaultMessage:
                'Create a report definition, or share/download a report from a dashboard, saved search or visualization.',
            }
          )}
        </EuiText>
        <EuiText>
          {i18n.translate(
            'opensearch.reports.reportsTable.emptyMessageReports.toLearnMore',
            { defaultMessage: 'To learn more, see' }
          )}{' '}
          <EuiLink
            href="https://opensearch.org/docs/dashboards/reporting/"
            target="_blank"
          >
            {i18n.translate(
              'opensearch.reports.reportsTable.emptyMessageReports.getStarted',
              {
                defaultMessage:
                  'Get started with OpenSearch Dashboards reporting',
              }
            )}
            <EuiIcon type="popout" />
          </EuiLink>
        </EuiText>
      </div>
    }
  />
);

export function ReportsTable(props: ReportsTableProps) {
  const {
    pagination,
    reportsTableItems,
    httpClient,
    handleSuccessToast,
    handleErrorToast,
    handlePermissionsMissingToast,
    resourceSharingConfig,
    sharePermissions,
    handleResourceSharingSuccessToast,
  } = props;

  const sortField = 'timeCreated';
  const sortDirection = 'des';
  const [showLoading, setShowLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);

  const handleLoading = (e: boolean) => {
    setShowLoading(e);
  };

  const onDemandDownload = async (id: string) => {
    handleLoading(true);
    await generateReportById(
      id,
      httpClient,
      handleSuccessToast,
      handleErrorToast,
      handlePermissionsMissingToast
    );
    handleLoading(false);
  };

  const reportsTableColumns = [
    {
      field: 'reportName',
      name: i18n.translate(
        'opensearch.reports.reportsTable.reportsTableColumns.Name',
        { defaultMessage: 'Name' }
      ),
      render: (reportName, item) => (
        <EuiLink
          disabled={item.state === 'Pending'}
          onClick={() => {
            window.location.assign(
              `reports-dashboards#/report_details/${item.id}`
            );
          }}
          id={'reportDetailsLink'}
        >
          {reportName}
        </EuiLink>
      ),
    },
    {
      // TODO: link to dashboard/visualization snapshot, use "queryUrl" field. Display dashboard name?
      field: 'reportSource',
      name: i18n.translate(
        'opensearch.reports.reportsTable.reportsTableColumns.Source',
        { defaultMessage: 'Source' }
      ),
      render: (source, item) =>
        item.state === 'Pending' ? (
          <EuiText size="s">{source}</EuiText>
        ) : (
          <EuiLink href={item.url} target="_blank">
            {source}
          </EuiLink>
        ),
    },
    {
      field: 'type',
      name: i18n.translate(
        'opensearch.reports.reportsTable.reportsTableColumns.Type',
        { defaultMessage: 'Type' }
      ),
      sortable: true,
      truncateText: false,
    },
    {
      field: 'timeCreated',
      name: i18n.translate(
        'opensearch.reports.reportsTable.reportsTableColumns.creationTime',
        { defaultMessage: 'Creation time' }
      ),
      render: (date) => {
        const readable = humanReadableDate(date);
        return <EuiText size="s">{readable}</EuiText>;
      },
    },
    {
      field: 'state',
      name: i18n.translate(
        'opensearch.reports.reportsTable.reportsTableColumns.State',
        { defaultMessage: 'State' }
      ),
      sortable: true,
      truncateText: false,
    },
    {
      field: 'id',
      name: i18n.translate(
        'opensearch.reports.reportsTable.reportsTableColumns.Generate',
        { defaultMessage: 'Generate' }
      ),
      render: (id, item) =>
        item.state === 'Pending' ? (
          <EuiText size="s">
            {fileFormatsUpper[item.format]} <EuiIcon type="importAction" />
          </EuiText>
        ) : (
          <EuiLink
            onClick={() => onDemandDownload(id)}
            id="landingPageOnDemandDownload"
          >
            {fileFormatsUpper[item.format]} <EuiIcon type="importAction" />
          </EuiLink>
        ),
    },
  ];

  const reportInstanceAccessLevels = getAccessLevelsForType(
    resourceSharingConfig as ResourceSharingConfig,
    REPORT_INSTANCE_RESOURCE_TYPE
  );

  if (
    supportsResourceSharingForType(
      resourceSharingConfig as ResourceSharingConfig,
      REPORT_INSTANCE_RESOURCE_TYPE
    )
  ) {
    reportsTableColumns.push({
      name: i18n.translate(
        'opensearch.reports.reportsTable.reportsTableColumns.Share',
        { defaultMessage: 'Share' }
      ),
      render: (item) => {
        const canShare = sharePermissions[item.id] === true;

        return (
          <EuiSmallButtonEmpty
            iconType="share"
            onClick={() => canShare && setSelectedReport(item)}
            disabled={!canShare}
            title={
              canShare
                ? undefined
                : i18n.translate(
                    'opensearch.reports.reportsTable.reportsTableColumns.ShareButtonDisabledTooltip',
                    {
                      defaultMessage:
                        'You do not have permission to share this report.',
                    }
                  )
            }
            data-test-subj={`reportShareButton-${item.id}`}
          >
            {i18n.translate(
              'opensearch.reports.reportsTable.reportsTableColumns.ShareButtonLabel',
              { defaultMessage: 'Share' }
            )}
          </EuiSmallButtonEmpty>
        );
      },
    });
  }

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const reportsListSearch = {
    box: {
      incremental: true,
      compressed: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'type',
        name: i18n.translate(
          'opensearch.reports.reportsTable.reportsListSearch.Type',
          { defaultMessage: 'Type' }
        ),
        multiSelect: 'or',
        options: reportTypeOptions.map((type) => ({
          value: type,
          name: type,
          view: type,
        })),
      },
      {
        type: 'field_value_selection',
        field: 'state',
        name: i18n.translate(
          'opensearch.reports.reportsTable.reportsListSearch.State',
          { defaultMessage: 'State' }
        ),
        multiSelect: 'or',
        options: reportStatusOptions.map((state) => ({
          value: state,
          name: state,
          view: state,
        })),
      },
    ],
    compressed: true,
  };

  const displayMessage =
    reportsTableItems.length === 0
      ? emptyMessageReports
      : i18n.translate(
          'opensearch.reports.reportsTable.reportsListSearch.noRreportsMatch',
          {
            defaultMessage: '0 reports match the search criteria. Search again',
          }
        );

  const showLoadingModal = showLoading ? (
    <GenerateReportLoadingModal setShowLoading={setShowLoading} />
  ) : null;

  return (
    <Fragment>
      <EuiInMemoryTable
        items={reportsTableItems}
        itemId="id"
        loading={false}
        message={displayMessage}
        columns={reportsTableColumns}
        search={reportsListSearch}
        pagination={pagination}
        sorting={sorting}
        hasActions={true}
        tableLayout={'auto'}
      />
      {showLoadingModal}
      {selectedReport && (
        <ResourceSharingModal
          isOpen={true}
          onClose={() => setSelectedReport(null)}
          onSaveSuccess={handleResourceSharingSuccessToast}
          httpClient={httpClient}
          resourceId={selectedReport.id}
          resourceName={selectedReport.reportName}
          resourceType={REPORT_INSTANCE_RESOURCE_TYPE}
          resourceLabel={i18n.translate(
            'opensearch.reports.reportsTable.resourceLabel',
            {
              defaultMessage: 'report',
            }
          )}
          accessLevels={reportInstanceAccessLevels}
        />
      )}
    </Fragment>
  );
}
