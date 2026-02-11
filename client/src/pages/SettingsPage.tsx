import { LoadingScreen } from '../components/LoadingScreen';
import { RetryErrorState } from '../components/RetryErrorState';
import { SettingsNotificationsCard } from '../components/SettingsNotificationsCard';
import { SettingsProvider } from '../contexts/SettingsContext';
import { useSettings } from '../hooks/useSettings';

function SettingsPageContent() {
  const { settings, error, refetch } = useSettings();

  if (error) {
    return <RetryErrorState message={error} onRetry={refetch} />;
  }

  if (!settings) {
    return <LoadingScreen text="Loading settings..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground-strong">Settings</h2>
        <p className="mt-2 text-sm text-foreground-muted">Configure how Konttivahti behaves.</p>
      </div>
      <section>
        <SettingsNotificationsCard />
      </section>
    </div>
  );
}

export function SettingsPage() {
  return (
    <SettingsProvider>
      <SettingsPageContent />
    </SettingsProvider>
  );
}
