import { FlaskConical, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { NotificationTestResponse } from '../types';
import { apiRequest, parseApiResponse } from '../utils/request';
import { Button, CompactButton } from './Button';
import { Input } from './Input';

interface SettingsRecipientRowProps {
  name: string;
  value: string;
  isEmpty: boolean;
  onChange: (value: string) => void;
  onDelete: () => void;
}

export function SettingsRecipientRow({
  name,
  value,
  isEmpty,
  onChange,
  onDelete,
}: SettingsRecipientRowProps) {
  const [isTesting, setIsTesting] = useState(false);
  const isDisabled = isTesting || isEmpty;

  const handleTestNotification = async () => {
    const url = value.trim();
    if (!url || isTesting) return;

    setIsTesting(true);

    const sendPromise = (async () => {
      const response = await apiRequest('/api/notifications/test', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      const result = await parseApiResponse(response, NotificationTestResponse);
      if (!result.ok) {
        throw new Error(result.error.error || 'Test notification failed.');
      }

      const payload = result.data;
      if (!payload.sent || payload.error) {
        throw new Error(payload.error ?? 'Test notification failed.');
      }
    })();

    toast.promise(sendPromise, {
      loading: 'Sending test notification...',
      success: 'Test notification sent.',
      error: (err) => (err instanceof Error ? err.message : 'Test notification failed.'),
    });

    try {
      await sendPromise;
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-row flex-nowrap items-center space-x-3">
      <div className="min-w-0 flex-1">
        <Input
          name={name}
          type="text"
          placeholder="discord://token@webhookId"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <CompactButton
        label="Test"
        onClick={handleTestNotification}
        disabled={isDisabled}
        icon={
          isTesting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <FlaskConical className="size-4" aria-hidden />
          )
        }
      />
      <Button size="icon" icon={<Trash2 className="size-4" aria-hidden />} onClick={onDelete} />
    </div>
  );
}
