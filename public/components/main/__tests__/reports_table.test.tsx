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
import { ReportsTable } from '../reports_table';
import httpClientMock from '../../../../test/httpMockClient';

const pagination = {
  initialPageSize: 10,
  pageSizeOptions: [8, 10, 13],
};

const emptyResourceSharingConfig = {
  enabled: false,
  types: [],
};

describe('<ReportsTable /> panel', () => {
  test('render component', () => {
    const reportsTableItems = [
      {
        id: '1',
        reportName: 'test report table item',
        type: 'Test type',
        sender: 'N/A',
        recipients: 'N/A',
        reportSource: 'Test report source',
        lastUpdated: 'test updated time',
        state: 'Created',
        url: 'Test url',
      },
    ];
    const { container } = render(
      <ReportsTable
        reportsTableItems={reportsTableItems}
        httpClient={httpClientMock}
        pagination={pagination}
        handleSuccessToast={jest.fn()}
        handleErrorToast={jest.fn()}
        handlePermissionsMissingToast={jest.fn()}
        resourceSharingConfig={emptyResourceSharingConfig}
        sharePermissions={{}}
        handleResourceSharingSuccessToast={jest.fn()}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('render empty component', async () => {
    const { container } = render(
      <ReportsTable
        reportsTableItems={[]}
        httpClient={httpClientMock}
        pagination={pagination}
        handleSuccessToast={jest.fn()}
        handleErrorToast={jest.fn()}
        handlePermissionsMissingToast={jest.fn()}
        resourceSharingConfig={emptyResourceSharingConfig}
        sharePermissions={{}}
        handleResourceSharingSuccessToast={jest.fn()}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('click on generate button', async () => {
    const reportsTableItems = [
      {
        id: '1',
        reportName: 'test report table item',
        type: 'Test type',
        sender: 'N/A',
        recipients: 'N/A',
        reportSource: 'Test report source',
        lastUpdated: 'test updated time',
        state: 'Created',
        url: 'Test url',
      },
    ];

    render(
      <ReportsTable
        reportsTableItems={reportsTableItems}
        httpClient={httpClientMock}
        pagination={pagination}
        handleSuccessToast={jest.fn()}
        handleErrorToast={jest.fn()}
        handlePermissionsMissingToast={jest.fn()}
        resourceSharingConfig={emptyResourceSharingConfig}
        sharePermissions={{}}
        handleResourceSharingSuccessToast={jest.fn()}
      />
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(6);
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[6]);
    });
  });
});
