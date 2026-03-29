/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ReportDefinitions } from '../report_definitions_table';
import httpClientMock from '../../../../test/httpMockClient';

const pagination = {
  initialPageSize: 10,
  pageSizeOptions: [8, 10, 13],
};

const emptyResourceSharingConfig = {
  enabled: false,
  types: [],
};

describe('<ReportDefinitions /> panel', () => {
  test('render component', () => {
    const reportDefinitionsTableContent = [
      {
        id: '1',
        reportName: 'test report name',
        type: 'Download',
        owner: 'davidcui',
        source: 'Dashboard',
        baseUrl: 'http://localhost:5601/app/dashboards#/view/1',
        lastUpdated: 'test updated time',
        details: '',
        status: 'Created',
      },
      {
        id: '2',
        reportName: 'test report name 2',
        type: 'Download',
        owner: 'davidcui',
        source: 'Dashboard',
        baseUrl: 'http://localhost:5601/app/dashboards#/view/2',
        lastUpdated: 'test updated time',
        details: '',
        status: 'Created',
      },
    ];
    const { container } = render(
      <ReportDefinitions
        pagination={pagination}
        reportDefinitionsTableContent={reportDefinitionsTableContent}
        httpClient={httpClientMock}
        resourceSharingConfig={emptyResourceSharingConfig}
        sharePermissions={{}}
        handleResourceSharingSuccessToast={jest.fn()}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('render empty table', () => {
    const { container } = render(
      <ReportDefinitions
        pagination={pagination}
        reportDefinitionsTableContent={[]}
        httpClient={httpClientMock}
        resourceSharingConfig={emptyResourceSharingConfig}
        sharePermissions={{}}
        handleResourceSharingSuccessToast={jest.fn()}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('click on report definition row', async () => {
    window = Object.create(window);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: jest.fn(),
      },
    });
    const reportDefinitionsTableContent = [
      {
        id: '1',
        reportName: 'test report name',
        type: 'Download',
        owner: 'davidcui',
        source: 'Dashboard',
        baseUrl: 'http://localhost:5601/app/dashboards#/view/1',
        lastUpdated: 'test updated time',
        details: '',
        status: 'Created',
      },
      {
        id: '2',
        reportName: 'test report name 2',
        type: 'Download',
        owner: 'davidcui',
        source: 'Dashboard',
        baseUrl: 'http://localhost:5601/app/dashboards#/view/2',
        lastUpdated: 'test updated time',
        details: '',
        status: 'Created',
      },
    ];

    render(
      <ReportDefinitions
        pagination={pagination}
        reportDefinitionsTableContent={reportDefinitionsTableContent}
        httpClient={httpClientMock}
        resourceSharingConfig={emptyResourceSharingConfig}
        sharePermissions={{}}
        handleResourceSharingSuccessToast={jest.fn()}
      />
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(3);
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[3]);
    });
  });
});
