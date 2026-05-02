import { Home, LogOut, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { CompactButton } from './Button';
import logo from '../assets/logo.svg';
import { ThemeMenu } from './ThemeMenu';

interface AppHeaderProps {
  onLogout: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  const location = useLocation();
  const homeActive = location.pathname === '/';
  const settingsActive = location.pathname.startsWith('/settings');

  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex min-w-0 items-center space-x-2 md:space-x-6">
        <Link to="/" className="flex items-center space-x-2 text-2xl font-bold">
          <img src={logo} alt="" className="h-10 w-auto" />
          <span className="hidden xs:block">Konttivahti</span>
        </Link>
        <nav className="flex items-center space-x-2">
          <CompactButton
            to="/"
            variant="ghost"
            icon={<Home className="size-4" aria-hidden="true" />}
            label="Home"
            compactUntil="md"
            className={homeActive ? 'bg-surface-1!' : ''}
          />
          <CompactButton
            to="/settings"
            variant="ghost"
            icon={<Settings className="size-4" aria-hidden="true" />}
            label="Settings"
            compactUntil="md"
            className={settingsActive ? 'bg-surface-1!' : ''}
          />
        </nav>
      </div>
      <div className="flex items-center space-x-2">
        <ThemeMenu />
        <CompactButton
          onClick={onLogout}
          variant="secondary"
          label="Logout"
          icon={<LogOut className="size-4" aria-hidden="true" />}
          compactUntil="md"
        />
      </div>
    </div>
  );
}
