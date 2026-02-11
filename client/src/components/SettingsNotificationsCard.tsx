import { Loader2, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ApiErrorResponse } from '../types';
import { useSettings } from '../hooks/useSettings';
import { apiRequest } from '../utils/request';
import { Button } from './Button';
import { Card } from './Card';
import { SettingsEventToggle } from './SettingsEventToggle';
import { SettingsRecipientRow } from './SettingsRecipientRow';
import { ToggleSwitch } from './ToggleSwitch';

export function SettingsNotificationsCard() {
  const {
    settings,
    eventToggles,
    toggleNotificationsEnabled,
    addRecipient,
    changeRecipient,
    removeRecipient,
    toggleEvent,
  } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  if (!settings) return null;

  const handleSaveNotifications = async () => {
    if (isSaving) return;

    setIsSaving(true);

    const savePromise = (async () => {
      const cleanedRecipients = settings.notifications_recipients
        .map((recipient) => recipient.trim())
        .filter(Boolean);
      const enabledEvents = settings.notifications_available_events
        .filter((event) => eventToggles[event.id])
        .map((event) => event.id);
      const response = await apiRequest('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          notifications_enabled: settings.notifications_enabled,
          notifications_recipients: cleanedRecipients,
          notifications_events: enabledEvents,
        }),
      });
      if (!response.ok) {
        const rawPayload = await response.json().catch(() => null);
        const parsedError = ApiErrorResponse.safeParse(rawPayload);
        throw new Error(
          parsedError.success ? parsedError.data.error : 'Failed to save notification settings.',
        );
      }
    })();

    toast.promise(savePromise, {
      loading: 'Saving notification settings...',
      success: 'Notification settings saved.',
      error: (err) =>
        err instanceof Error ? err.message : 'Failed to save notification settings.',
    });

    try {
      await savePromise;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <div>
        <div className="flex items-center">
          <h3 className="mr-2 text-base font-semibold text-foreground-strong">Notifications</h3>
          <ToggleSwitch
            checked={settings.notifications_enabled}
            onCheckedChange={toggleNotificationsEnabled}
          />
        </div>
        <p className="mt-2 text-sm text-foreground-subtle">Get notified for specific events.</p>
      </div>
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-foreground-strong">Notification URLs</h4>
        <p className="mt-2 text-xs text-foreground-subtle">
          Accepts{' '}
          <a
            href="https://github.com/containrrr/shoutrrr"
            className="text-foreground underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Shoutrrr
          </a>{' '}
          URLs. See supported services and URL formats in{' '}
          <a
            href="https://containrrr.dev/shoutrrr/v0.8/services/overview/"
            className="text-foreground underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            the Shoutrrr documentation
          </a>
          .
        </p>
        {settings.notifications_recipients.length > 0 ? (
          <div className="mt-4 space-y-3">
            {settings.notifications_recipients.map((recipient, index) => (
              <SettingsRecipientRow
                key={`recipient-${index}`}
                name={`recipient-${index}`}
                value={recipient}
                isEmpty={recipient.trim().length === 0}
                onChange={(value) => changeRecipient(index, value)}
                onDelete={() => removeRecipient(index)}
              />
            ))}
          </div>
        ) : null}
        <div className="mt-4">
          <Button
            label="New"
            onClick={addRecipient}
            icon={<Plus className="size-4" aria-hidden />}
          />
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-foreground-strong">Events</h4>
          <p className="mt-2 text-xs text-foreground-subtle">
            Choose which events to receive notifications for.
          </p>
          <div className="mt-4 space-y-3">
            {settings.notifications_available_events.map((event) => (
              <SettingsEventToggle
                key={event.id}
                label={event.label}
                description={event.description}
                checked={Boolean(eventToggles[event.id])}
                onChange={(checked) => toggleEvent(event.id, checked)}
              />
            ))}
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-end">
            <Button
              label="Save changes"
              onClick={handleSaveNotifications}
              disabled={isSaving}
              icon={
                isSaving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )
              }
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
