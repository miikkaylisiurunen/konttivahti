import type { Container } from '../types';
import { Card } from './Card';

interface SummaryCardsProps {
  containers: Container[];
}

export function SummaryCards({ containers }: SummaryCardsProps) {
  const totalContainers = containers.length;
  const upToDateCount = containers.filter((c) => c.status === 'up_to_date').length;
  const outdatedCount = containers.filter((c) => c.status === 'outdated').length;
  const errorCount = containers.filter((c) => c.status === 'error' || c.error).length;

  return (
    <div className="mb-4 grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <div className="text-xs font-medium uppercase text-foreground-muted">Total</div>
        <div className="text-3xl font-bold text-foreground-strong">{totalContainers}</div>
      </Card>
      <Card>
        <div className="text-xs font-medium uppercase text-foreground-muted">Up to Date</div>
        <div className="text-3xl font-bold text-foreground-strong">{upToDateCount}</div>
      </Card>
      <Card>
        <div className="text-xs font-medium uppercase text-foreground-muted">Outdated</div>
        <div className="text-3xl font-bold text-foreground-strong">{outdatedCount}</div>
      </Card>
      <Card>
        <div className="text-xs font-medium uppercase text-foreground-muted">Errors</div>
        <div className="text-3xl font-bold text-foreground-strong">{errorCount}</div>
      </Card>
    </div>
  );
}
