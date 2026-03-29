/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCompressedComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSelect,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { HttpSetup } from '../../../../../src/core/public';
import {
  ResourceSharingResponse,
  ShareRecipients,
  ShareWith,
  formatAccessLevelLabel,
  isShareCapableAccessLevel,
} from './resource_sharing_utils';

interface AccessLevelRow {
  accessLevel: string;
  users: string[];
  roles: string[];
}

interface SharingFormState {
  generalAccess: string | null;
  levels: AccessLevelRow[];
}

interface SharingDiff {
  add?: ShareWith;
  revoke?: ShareWith;
  generalAccessChanged: boolean;
}

interface ResourceSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  httpClient: HttpSetup;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceLabel: string;
  accessLevels: string[];
}

const toOptions = (values: string[]) =>
  values.map((value) => ({ label: value }));
const fromOptions = (options: Array<{ label: string }>) =>
  options.map((option) => option.label);

const isShareRecipients = (
  value: ShareWith[string]
): value is ShareRecipients =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createEmptyAccessLevelRow = (accessLevel: string): AccessLevelRow => ({
  accessLevel,
  users: [],
  roles: [],
});

const createEmptyFormState = (
  accessLevels: string[] = []
): SharingFormState => ({
  generalAccess: null,
  levels: accessLevels.slice(0, 1).map(createEmptyAccessLevelRow),
});

const normalizeShareWith = (
  shareWith?: ShareWith,
  accessLevels: string[] = []
): SharingFormState => {
  if (!shareWith) {
    return createEmptyFormState(accessLevels);
  }

  const levels = Object.entries(shareWith)
    .filter(([accessLevel]) => accessLevel !== 'general_access')
    .filter(([, recipients]) => isShareRecipients(recipients))
    .map(([accessLevel, recipients]) => ({
      accessLevel,
      users: [...(recipients.users || [])].sort(),
      roles: [...(recipients.roles || [])].sort(),
    }))
    .filter((entry) => entry.users.length > 0 || entry.roles.length > 0)
    .sort((left, right) => left.accessLevel.localeCompare(right.accessLevel));

  return {
    generalAccess:
      typeof shareWith.general_access === 'string'
        ? shareWith.general_access
        : null,
    levels:
      levels.length > 0 ? levels : createEmptyFormState(accessLevels).levels,
  };
};

const serializeShareWith = (formState: SharingFormState): ShareWith => {
  const shareWith: ShareWith = {};

  if (formState.generalAccess) {
    shareWith.general_access = formState.generalAccess;
  }

  formState.levels.forEach(({ accessLevel, users, roles }) => {
    const recipients: ShareRecipients = {};

    if (users.length > 0) {
      recipients.users = [...new Set(users)];
    }

    if (roles.length > 0) {
      recipients.roles = [...new Set(roles)];
    }

    if (recipients.users || recipients.roles) {
      shareWith[accessLevel] = recipients;
    }
  });

  return shareWith;
};

const isEmptyShareWith = (shareWith?: ShareWith) =>
  !shareWith || Object.keys(shareWith).length === 0;

const setDifference = (left: string[], right: string[]) =>
  left.filter((value) => !right.includes(value));

const buildRecipientsDiff = (
  beforeRecipients?: ShareRecipients,
  afterRecipients?: ShareRecipients
) => {
  const addUsers = setDifference(
    afterRecipients?.users || [],
    beforeRecipients?.users || []
  );
  const addRoles = setDifference(
    afterRecipients?.roles || [],
    beforeRecipients?.roles || []
  );
  const revokeUsers = setDifference(
    beforeRecipients?.users || [],
    afterRecipients?.users || []
  );
  const revokeRoles = setDifference(
    beforeRecipients?.roles || [],
    afterRecipients?.roles || []
  );

  const add: ShareRecipients = {};
  const revoke: ShareRecipients = {};

  if (addUsers.length > 0) {
    add.users = addUsers;
  }
  if (addRoles.length > 0) {
    add.roles = addRoles;
  }
  if (revokeUsers.length > 0) {
    revoke.users = revokeUsers;
  }
  if (revokeRoles.length > 0) {
    revoke.roles = revokeRoles;
  }

  return {
    add: Object.keys(add).length > 0 ? add : undefined,
    revoke: Object.keys(revoke).length > 0 ? revoke : undefined,
  };
};

const buildSharingDiff = (
  beforeState: SharingFormState,
  afterState: SharingFormState
): SharingDiff => {
  const beforeShareWith = serializeShareWith(beforeState);
  const afterShareWith = serializeShareWith(afterState);
  const add: ShareWith = {};
  const revoke: ShareWith = {};
  const accessLevels = new Set([
    ...Object.keys(beforeShareWith),
    ...Object.keys(afterShareWith),
  ]);

  accessLevels.delete('general_access');

  accessLevels.forEach((accessLevel) => {
    const beforeRecipients = beforeShareWith[accessLevel];
    const afterRecipients = afterShareWith[accessLevel];

    if (
      !isShareRecipients(beforeRecipients) &&
      !isShareRecipients(afterRecipients)
    ) {
      return;
    }

    const recipientsDiff = buildRecipientsDiff(
      isShareRecipients(beforeRecipients) ? beforeRecipients : undefined,
      isShareRecipients(afterRecipients) ? afterRecipients : undefined
    );

    if (recipientsDiff.add) {
      add[accessLevel] = recipientsDiff.add;
    }

    if (recipientsDiff.revoke) {
      revoke[accessLevel] = recipientsDiff.revoke;
    }
  });

  return {
    add: isEmptyShareWith(add) ? undefined : add,
    revoke: isEmptyShareWith(revoke) ? undefined : revoke,
    generalAccessChanged:
      beforeState.generalAccess !== afterState.generalAccess,
  };
};

const getStateSignature = (formState: SharingFormState) =>
  JSON.stringify(serializeShareWith(formState));

const extractErrorMessage = (error: unknown) => {
  const errorBody = (error as { body?: { message?: string } | string })?.body;
  const errorMessage = (error as { message?: string })?.message;

  if (typeof errorBody === 'string') {
    return errorBody;
  }

  if (
    typeof errorBody === 'object' &&
    errorBody !== null &&
    typeof errorBody.message === 'string'
  ) {
    return errorBody.message;
  }

  if (typeof errorMessage === 'string') {
    return errorMessage;
  }

  return 'Unable to update sharing for this resource.';
};

export function ResourceSharingModal({
  isOpen,
  onClose,
  onSaveSuccess,
  httpClient,
  resourceId,
  resourceName,
  resourceType,
  resourceLabel,
  accessLevels,
}: ResourceSharingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<SharingFormState>(
    createEmptyFormState(accessLevels)
  );
  const [initialState, setInitialState] = useState<SharingFormState>(
    createEmptyFormState(accessLevels)
  );
  const [initialSignature, setInitialSignature] = useState(
    getStateSignature(createEmptyFormState(accessLevels))
  );

  const generalAccessLevels = useMemo(
    () =>
      accessLevels.filter(
        (accessLevel) => !isShareCapableAccessLevel(accessLevel)
      ),
    [accessLevels]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadSharingInfo = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = (await httpClient.get(
          '../api/reporting/resourceSharing/view',
          {
            query: {
              resourceId,
              resourceType,
            },
          }
        )) as ResourceSharingResponse;

        const nextState = normalizeShareWith(
          response?.sharing_info?.share_with,
          accessLevels
        );
        setFormState(nextState);
        setInitialState(nextState);
        setInitialSignature(getStateSignature(nextState));
      } catch (error) {
        setErrorMessage(extractErrorMessage(error));
        const emptyState = createEmptyFormState(accessLevels);
        setFormState(emptyState);
        setInitialState(emptyState);
        setInitialSignature(getStateSignature(emptyState));
      } finally {
        setIsLoading(false);
      }
    };

    loadSharingInfo();
  }, [accessLevels, httpClient, isOpen, resourceId, resourceType]);

  const hasChanges = getStateSignature(formState) !== initialSignature;
  const hasExistingSharing =
    getStateSignature(initialState) !==
    getStateSignature(createEmptyFormState(accessLevels));
  const hasUnusedAccessLevels = accessLevels.some(
    (accessLevel) =>
      !formState.levels.some(
        (levelEntry) => levelEntry.accessLevel === accessLevel
      )
  );

  const updateAccessLevel = (index: number, accessLevel: string) => {
    setFormState((previousState) => ({
      ...previousState,
      levels: previousState.levels.map((levelEntry, levelIndex) =>
        levelIndex === index ? { ...levelEntry, accessLevel } : levelEntry
      ),
    }));
  };

  const updateRecipients = (
    index: number,
    recipientType: 'users' | 'roles',
    values: string[]
  ) => {
    setFormState((previousState) => ({
      ...previousState,
      levels: previousState.levels.map((levelEntry, levelIndex) =>
        levelIndex === index
          ? { ...levelEntry, [recipientType]: values }
          : levelEntry
      ),
    }));
  };

  const removeAccessLevel = (index: number) => {
    setFormState((previousState) => ({
      ...previousState,
      levels: (() => {
        const nextLevels = previousState.levels.filter(
          (_, levelIndex) => levelIndex !== index
        );

        return nextLevels.length > 0
          ? nextLevels
          : createEmptyFormState(accessLevels).levels;
      })(),
    }));
  };

  const addAccessLevel = () => {
    const nextAccessLevel = accessLevels.find(
      (accessLevel) =>
        !formState.levels.some(
          (levelEntry) => levelEntry.accessLevel === accessLevel
        )
    );

    if (!nextAccessLevel) {
      return;
    }

    setFormState((previousState) => ({
      ...previousState,
      levels: [
        ...previousState.levels,
        {
          accessLevel: nextAccessLevel,
          users: [],
          roles: [],
        },
      ],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (!hasExistingSharing) {
        await httpClient.put('../api/reporting/resourceSharing/share', {
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resource_id: resourceId,
            resource_type: resourceType,
            share_with: serializeShareWith(formState),
          }),
        });
      } else {
        const diff = buildSharingDiff(initialState, formState);
        await httpClient.post('../api/reporting/resourceSharing/update', {
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resource_id: resourceId,
            resource_type: resourceType,
            ...(diff.add ? { add: diff.add } : {}),
            ...(diff.revoke ? { revoke: diff.revoke } : {}),
            ...(diff.generalAccessChanged
              ? { general_access: formState.generalAccess }
              : {}),
          }),
        });
      }

      onSaveSuccess();
      onClose();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal onClose={onClose} style={{ width: 720 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{`Share "${resourceName}"`}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <EuiBadge color="hollow" iconType="documents">
            {resourceLabel.charAt(0).toUpperCase() + resourceLabel.slice(1)}
          </EuiBadge>
        </EuiText>
        <EuiSpacer size="s" />

        {errorMessage && (
          <>
            <EuiCallOut title="Request failed" color="danger" iconType="alert">
              <p>{errorMessage}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {isLoading ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiForm component="form">
            <EuiCallOut title="Sharing settings" iconType="share" size="s">
              <p>
                Named users and roles can have their own access levels, and
                general access sets the baseline access for everyone.
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />

            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <h4>General access</h4>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFormRow label="Baseline access">
              <EuiSelect
                options={[
                  { value: '', text: 'Private' },
                  ...generalAccessLevels.map((accessLevel) => ({
                    value: accessLevel,
                    text: formatAccessLevelLabel(accessLevel),
                  })),
                ]}
                value={formState.generalAccess || ''}
                onChange={(event) =>
                  setFormState((previousState) => ({
                    ...previousState,
                    generalAccess: event.target.value || null,
                  }))
                }
              />
            </EuiFormRow>

            <EuiSpacer size="m" />
            <EuiHorizontalRule margin="m" />
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <h4>Named access</h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButtonEmpty
                  iconType="plusInCircle"
                  onClick={addAccessLevel}
                  isDisabled={!hasUnusedAccessLevels}
                >
                  Add access level
                </EuiSmallButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>

            {formState.levels.map((levelEntry, index) => {
              const availableAccessLevels = accessLevels.filter(
                (accessLevel) =>
                  accessLevel === levelEntry.accessLevel ||
                  !formState.levels.some(
                    (existingEntry) => existingEntry.accessLevel === accessLevel
                  )
              );

              return (
                <React.Fragment key={levelEntry.accessLevel}>
                  <EuiSpacer size="s" />
                  <EuiPanel hasBorder hasShadow={false} paddingSize="s">
                    <EuiFlexGroup alignItems="center" gutterSize="m">
                      <EuiFlexItem>
                        <EuiFormRow label="Access level">
                          <EuiSelect
                            options={availableAccessLevels.map(
                              (accessLevel) => ({
                                value: accessLevel,
                                text: formatAccessLevelLabel(accessLevel),
                              })
                            )}
                            value={levelEntry.accessLevel}
                            onChange={(event) =>
                              updateAccessLevel(index, event.target.value)
                            }
                          />
                        </EuiFormRow>
                      </EuiFlexItem>
                      {(formState.levels.length > 1 ||
                        levelEntry.users.length > 0 ||
                        levelEntry.roles.length > 0) && (
                        <EuiFlexItem grow={false}>
                          <EuiSmallButtonEmpty
                            color="danger"
                            iconType="trash"
                            onClick={() => removeAccessLevel(index)}
                          >
                            Remove
                          </EuiSmallButtonEmpty>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>

                    <EuiFlexGroup gutterSize="m" responsive={false}>
                      <EuiFlexItem>
                        <EuiFormRow label="Usernames">
                          <EuiCompressedComboBox
                            noSuggestions
                            placeholder="Add usernames"
                            selectedOptions={toOptions(levelEntry.users)}
                            onCreateOption={(value) =>
                              updateRecipients(index, 'users', [
                                ...levelEntry.users,
                                value,
                              ])
                            }
                            onChange={(options) =>
                              updateRecipients(
                                index,
                                'users',
                                fromOptions(options)
                              )
                            }
                          />
                        </EuiFormRow>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFormRow label="Roles">
                          <EuiCompressedComboBox
                            noSuggestions
                            placeholder="Add roles"
                            selectedOptions={toOptions(levelEntry.roles)}
                            onCreateOption={(value) =>
                              updateRecipients(index, 'roles', [
                                ...levelEntry.roles,
                                value,
                              ])
                            }
                            onChange={(options) =>
                              updateRecipients(
                                index,
                                'roles',
                                fromOptions(options)
                              )
                            }
                          />
                        </EuiFormRow>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </React.Fragment>
              );
            })}
          </EuiForm>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isSaving}>
          Cancel
        </EuiButtonEmpty>
        <EuiButton
          onClick={handleSave}
          fill
          isLoading={isSaving}
          isDisabled={isLoading || isSaving || !hasChanges}
        >
          Save sharing
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
