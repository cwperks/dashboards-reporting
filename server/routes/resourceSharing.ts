/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
import { API_PREFIX } from '../../common';
import { errorResponse } from './utils/helpers';

const SECURITY_DASHBOARDS_INFO_API = '/_plugins/_security/dashboardsinfo';
const SECURITY_RESOURCE_LIST_API = '/_plugins/_security/api/resource/list';
const SECURITY_RESOURCE_TYPES_API = '/_plugins/_security/api/resource/types';
const SECURITY_RESOURCE_SHARE_API = '/_plugins/_security/api/resource/share';

const getResponseBody = (response: { body?: unknown } | unknown) =>
  typeof response === 'object' && response !== null && 'body' in response
    ? response.body
    : response;

// eslint-disable-next-line import/no-default-export
export default function (router: IRouter) {
  router.get(
    {
      path: `${API_PREFIX}/resourceSharing/config`,
      validate: false,
    },
    async (context, _request, response) => {
      // @ts-ignore
      const logger = context.reporting_plugin.logger;
      const client = context.core.opensearch.client.asCurrentUser;

      try {
        const dashboardsInfoResponse = await client.transport.request({
          method: 'GET',
          path: SECURITY_DASHBOARDS_INFO_API,
        });
        const dashboardsInfo = getResponseBody(dashboardsInfoResponse);
        const enabled = dashboardsInfo?.resource_sharing_enabled === true;

        if (!enabled) {
          return response.ok({
            body: {
              enabled: false,
              types: [],
            },
          });
        }

        try {
          const typesResponse = await client.transport.request({
            method: 'GET',
            path: SECURITY_RESOURCE_TYPES_API,
          });
          const typesBody = getResponseBody(typesResponse);

          return response.ok({
            body: {
              enabled: true,
              types: Array.isArray(typesBody)
                ? typesBody
                : typesBody?.types || [],
            },
          });
        } catch (error) {
          logger.warn(`Failed to fetch resource sharing types: ${error}`);
          return response.ok({
            body: {
              enabled: true,
              types: [],
            },
          });
        }
      } catch (error) {
        logger.warn(`Failed to fetch resource sharing config: ${error}`);
        return response.ok({
          body: {
            enabled: false,
            types: [],
          },
        });
      }
    }
  );

  router.get(
    {
      path: `${API_PREFIX}/resourceSharing/view`,
      validate: {
        query: schema.object({
          resourceId: schema.string(),
          resourceType: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.opensearch.client.asCurrentUser;
      const { resourceId, resourceType } = request.query;

      try {
        const sharingInfoResponse = await client.transport.request({
          method: 'GET',
          path: SECURITY_RESOURCE_SHARE_API,
          querystring: {
            resource_id: resourceId,
            resource_type: resourceType,
          },
        });

        return response.ok({
          body: getResponseBody(sharingInfoResponse),
        });
      } catch (error) {
        if (error?.statusCode === 404) {
          return response.ok({
            body: {
              sharing_info: {
                resource_id: resourceId,
                resource_type: resourceType,
                share_with: {},
              },
            },
          });
        }

        return errorResponse(response, error);
      }
    }
  );

  router.get(
    {
      path: `${API_PREFIX}/resourceSharing/list`,
      validate: {
        query: schema.object({
          resourceType: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.opensearch.client.asCurrentUser;

      try {
        const listResponse = await client.transport.request({
          method: 'GET',
          path: SECURITY_RESOURCE_LIST_API,
          querystring: {
            resource_type: request.query.resourceType,
          },
        });

        return response.ok({
          body: getResponseBody(listResponse),
        });
      } catch (error) {
        return errorResponse(response, error);
      }
    }
  );

  router.put(
    {
      path: `${API_PREFIX}/resourceSharing/share`,
      validate: {
        body: schema.object({
          resource_id: schema.string(),
          resource_type: schema.string(),
          share_with: schema.any(),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.opensearch.client.asCurrentUser;

      try {
        const shareResponse = await client.transport.request({
          method: 'PUT',
          path: SECURITY_RESOURCE_SHARE_API,
          body: request.body,
        });

        return response.ok({
          body: getResponseBody(shareResponse),
        });
      } catch (error) {
        return errorResponse(response, error);
      }
    }
  );

  router.post(
    {
      path: `${API_PREFIX}/resourceSharing/update`,
      validate: {
        body: schema.object({
          resource_id: schema.string(),
          resource_type: schema.string(),
          add: schema.maybe(schema.any()),
          revoke: schema.maybe(schema.any()),
          general_access: schema.maybe(schema.nullable(schema.string())),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.opensearch.client.asCurrentUser;

      try {
        const shareResponse = await client.transport.request({
          method: 'POST',
          path: SECURITY_RESOURCE_SHARE_API,
          body: request.body,
        });

        return response.ok({
          body: getResponseBody(shareResponse),
        });
      } catch (error) {
        return errorResponse(response, error);
      }
    }
  );
}
