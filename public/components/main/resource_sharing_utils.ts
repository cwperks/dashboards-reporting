/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const REPORT_DEFINITION_RESOURCE_TYPE = 'report-definition';
export const REPORT_INSTANCE_RESOURCE_TYPE = 'report-instance';

export interface ResourceSharingTypeEntry {
  type: string;
  access_levels: string[];
}

export interface ResourceSharingConfig {
  enabled: boolean;
  types: ResourceSharingTypeEntry[];
}

export interface ShareRecipients {
  users?: string[];
  roles?: string[];
  backend_roles?: string[];
}

export interface ShareWith {
  general_access?: string | null;
  [accessLevel: string]: ShareRecipients | string | null | undefined;
}

export interface ResourceSharingResponse {
  sharing_info?: {
    resource_id: string;
    resource_type: string;
    created_by?: {
      user?: string;
      tenant?: string;
    };
    share_with?: ShareWith;
    can_share?: boolean;
  };
}

export interface ResourceSharingListEntry {
  resource_id: string;
  can_share?: boolean;
}

export interface ResourceSharingListResponse {
  resources?: ResourceSharingListEntry[];
}

export type SharePermissionMap = Record<string, boolean>;

export const EMPTY_RESOURCE_SHARING_CONFIG: ResourceSharingConfig = {
  enabled: false,
  types: [],
};

export const getAccessLevelsForType = (
  resourceSharingConfig: ResourceSharingConfig,
  resourceType: string
) =>
  resourceSharingConfig.types.find(
    (typeEntry) => typeEntry.type === resourceType
  )?.access_levels || [];

export const supportsResourceSharingForType = (
  resourceSharingConfig: ResourceSharingConfig,
  resourceType: string
) =>
  resourceSharingConfig.enabled &&
  getAccessLevelsForType(resourceSharingConfig, resourceType).length > 0;

export const formatAccessLevelLabel = (accessLevel: string) => {
  const trimmedPrefix = accessLevel.includes('_')
    ? accessLevel.slice(accessLevel.indexOf('_') + 1)
    : accessLevel;
  const withSpaces = trimmedPrefix.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

export const isShareCapableAccessLevel = (accessLevel: string) =>
  accessLevel.toLowerCase().includes('full_access');

export const buildSharePermissionMap = (
  response?: ResourceSharingListResponse
): SharePermissionMap =>
  (response?.resources || []).reduce<SharePermissionMap>(
    (permissions, entry) => {
      permissions[entry.resource_id] = entry.can_share === true;
      return permissions;
    },
    {}
  );
