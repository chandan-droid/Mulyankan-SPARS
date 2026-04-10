import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, PanelLeftClose, PanelLeftOpen, Menu, X, KeyRound, Settings, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function DashboardLayout({ children, navItems }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, changePassword } = useAuth();
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const isCollapsed = !isMobile && isSidebarCollapsed;

  const sidebarWidthClass = isMobile ? 'w-[260px]' : isCollapsed ? 'w-[72px]' : 'w-[248px]';
  const contentOffsetClass = isMobile ? 'ml-0' : isCollapsed ? 'ml-[72px]' : 'ml-[248px]';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSubmitting(false);
  };

  const handlePasswordDialogOpenChange = (open) => {
    setOpenPasswordDialog(open);
    if (!open) {
      resetPasswordForm();
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    try {
      setPasswordSubmitting(true);
      await changePassword({
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      handlePasswordDialogOpenChange(false);
    } catch (error) {
      setPasswordSubmitting(false);
      toast.error(error?.message || 'Unable to change password');
    }
  };

  /* Separate nav items into main (nav) and utility (settings) groups */
  const settingsPath = user?.role === 'admin' ? '/admin/settings' : '/teacher/settings';
  const mainNavItems = navItems.filter((item) => item.label !== 'Settings');
  const isSettingsActive = location.pathname === settingsPath;

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return (
    <div className="flex min-h-screen bg-background bg-mesh">
      {/* Mobile hamburger */}
      {isMobile ? (
        <>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen((open) => !open)}
            className="fixed left-3 top-3 z-[70] flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-foreground shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-background"
            aria-label="Toggle navigation menu"
          >
            {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          {isMobileSidebarOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close navigation menu"
            />
          ) : null}
        </>
      ) : null}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-[60] flex h-screen flex-col border-r border-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarWidthClass} ${isMobile ? (isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}`}
        style={{
          background: 'linear-gradient(180deg, hsl(232 42% 13%) 0%, hsl(232 45% 9%) 100%)',
        }}
      >
        {/* Logo area */}
        <div className={`flex h-16 items-center border-b border-white/[0.06] ${isCollapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] p-0.5 overflow-hidden ring-1 ring-white/[0.08]">
              <img src="/outr.png" alt="OUTR Logo" className="h-full w-full object-contain rounded-lg" />
            </div>
            {!isCollapsed ? (
              <div className="min-w-0">
                <h1 className="text-sm font-heading font-bold leading-tight text-white/90 truncate">
                  मूल्यांकन
                </h1>
                <p className="text-[10px] font-medium text-white/30 capitalize">
                  {user?.role} Panel
                </p>
              </div>
            ) : null}
          </div>
          {!isMobile && !isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/60"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {!isMobile && isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="absolute -right-3 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-md transition-colors hover:text-foreground"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {!isCollapsed ? (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/20">
              Menu
            </p>
          ) : null}
          <div className="space-y-0.5">
            {mainNavItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`group relative flex w-full items-center rounded-lg text-[13px] font-medium transition-all duration-200 ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'} ${active ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {active && !isCollapsed ? (
                    <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-secondary" />
                  ) : null}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${active ? 'bg-gradient-to-br from-primary/20 to-secondary/10 text-white' : 'text-white/35 group-hover:text-white/60'}`}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                  </div>
                  {!isCollapsed ? (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Divider + Utility nav */}
          <div className={`mt-4 pt-4 border-t border-white/[0.06] ${isCollapsed ? '' : ''}`}>
            {!isCollapsed ? (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/20">
                System
              </p>
            ) : null}
            <button
              onClick={() => handleNavigate(settingsPath)}
              className={`group relative flex w-full items-center rounded-lg text-[13px] font-medium transition-all duration-200 ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'} ${isSettingsActive ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'}`}
              title={isCollapsed ? 'Settings' : undefined}
            >
              {isSettingsActive && !isCollapsed ? (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-secondary" />
              ) : null}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${isSettingsActive ? 'bg-gradient-to-br from-primary/20 to-secondary/10 text-white' : 'text-white/35 group-hover:text-white/60'}`}
              >
                <Settings className="h-[18px] w-[18px]" />
              </div>
              {!isCollapsed ? <span className="flex-1 text-left">Settings</span> : null}
            </button>
          </div>
        </nav>

        {/* User footer */}
        <div className={`border-t border-white/[0.06] ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {/* User card */}
          <div className={`mb-2 rounded-xl transition-colors ${isCollapsed ? 'flex justify-center py-2' : 'flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.05]'}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/80 to-secondary/80 text-[11px] font-bold text-white shadow-lg shadow-primary/10">
              {initials}
            </div>
            {!isCollapsed ? (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white/80 truncate">
                  {user?.name}
                </p>
                <p className="text-[10px] text-white/25 truncate">
                  {user?.email}
                </p>
              </div>
            ) : null}
          </div>

          {/* Quick actions */}
          <div className={`flex ${isCollapsed ? 'flex-col items-center gap-1' : 'gap-1'}`}>
            <button
              onClick={() => setOpenPasswordDialog(true)}
              className={`flex items-center rounded-lg text-[12px] font-medium text-white/30 hover:bg-white/[0.05] hover:text-white/60 transition-all duration-200 ${isCollapsed ? 'justify-center p-2' : 'flex-1 gap-2 px-3 py-2'}`}
              title={isCollapsed ? 'Change Password' : undefined}
            >
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              {!isCollapsed ? <span>Password</span> : null}
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center rounded-lg text-[12px] font-medium text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${isCollapsed ? 'justify-center p-2' : 'flex-1 gap-2 px-3 py-2'}`}
              title={isCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!isCollapsed ? <span>Sign Out</span> : null}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 p-3 pt-14 sm:p-5 md:p-8 lg:p-10 transition-[margin] duration-300 ${contentOffsetClass}`}>
        <div className="animate-fade-in-up max-w-full">{children}</div>
      </main>

      <Dialog
        open={openPasswordDialog}
        onOpenChange={handlePasswordDialogOpenChange}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl">
              Change Password
            </DialogTitle>
            <DialogDescription>
              Update your account password securely.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={passwordSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={passwordSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={passwordSubmitting}
                required
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePasswordDialogOpenChange(false)}
                disabled={passwordSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={passwordSubmitting}>
                {passwordSubmitting ? 'Saving...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
