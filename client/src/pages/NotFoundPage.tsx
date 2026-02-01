import { Button } from '../components/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="text-5xl font-semibold text-foreground">404</div>
        <p className="mt-3 text-sm text-foreground-muted">This page does not exist.</p>
        <div className="mt-6">
          <Button to="/" variant="secondary" label="Return home" />
        </div>
      </div>
    </div>
  );
}
