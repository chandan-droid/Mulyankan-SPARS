import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import {
  User,
  KeyRound,
  Bell,
  Palette,
  Shield,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Monitor,
  Mail,
  Smartphone,
  Save,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

function SettingSection({ icon: Icon, title, description, children, accentColor = 'text-primary' }) {
  return (
    <Card className="glass-card overflow-hidden animate-fade-in-up">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className={`h-5 w-5 ${accentColor}`} />
          </div>
          <div>
            <CardTitle className="text-base font-heading">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function ThemeOption({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all duration-300 ${
        active
          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border/60 bg-background/40 hover:border-border hover:bg-background/60'
      }`}
    >
      {active && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
          active
            ? 'bg-primary/15 text-primary'
            : 'bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span
        className={`text-xs font-semibold ${
          active ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/40 p-3.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export default function Settings({ navItems }) {
  const { user, changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [theme, setTheme] = useState('system');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [assessmentAlerts, setAssessmentAlerts] = useState(true);

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

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
      await changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error?.message || 'Unable to change password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleSavePreferences = () => {
    toast.success('Preferences saved successfully');
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh" />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account preferences, security, and notification settings.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.4fr_1fr]">
          {/* Profile Sidebar Card */}
          <div className="space-y-4">
            <Card className="glass-card overflow-hidden animate-fade-in-up">
              <CardContent className="p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-xl font-bold text-primary-foreground shadow-xl shadow-primary/20">
                    {initials}
                  </div>
                  <h3 className="text-base font-heading font-bold text-foreground">
                    {user?.name || 'User'}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {user?.email || 'No email'}
                  </p>
                  <Badge className="mt-3 rounded-full border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary capitalize">
                    {user?.role || 'User'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <CardContent className="p-4 space-y-1">
                {[
                  { label: 'Profile', icon: User },
                  { label: 'Security', icon: Shield },
                  { label: 'Appearance', icon: Palette },
                  { label: 'Notifications', icon: Bell },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Settings Content */}
          <div className="space-y-5">
            {/* Profile Section */}
            <SettingSection
              icon={User}
              title="Profile Information"
              description="Your personal details and account metadata."
              accentColor="text-primary"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                  <Input
                    value={user?.name || ''}
                    disabled
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</Label>
                  <Input
                    value={user?.role || ''}
                    disabled
                    className="bg-muted/30 capitalize"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">User ID</Label>
                  <Input
                    value={user?.id || ''}
                    disabled
                    className="bg-muted/30 font-mono text-xs"
                  />
                </div>
              </div>
            </SettingSection>

            {/* Security Section */}
            <SettingSection
              icon={Shield}
              title="Security"
              description="Update your password and manage account security."
              accentColor="text-secondary"
            >
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="settings-current-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Current Password
                    </Label>
                    <Input
                      id="settings-current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current"
                      disabled={passwordSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-new-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      New Password
                    </Label>
                    <Input
                      id="settings-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new"
                      disabled={passwordSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-confirm-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Confirm Password
                    </Label>
                    <Input
                      id="settings-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new"
                      disabled={passwordSubmitting}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={passwordSubmitting}
                    className="btn-gradient h-9 rounded-lg px-5 text-xs font-semibold"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                    {passwordSubmitting ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </SettingSection>

            {/* Appearance Section */}
            <SettingSection
              icon={Palette}
              title="Appearance"
              description="Customize how the application looks and feels."
              accentColor="text-accent"
            >
              <div>
                <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Theme
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <ThemeOption
                    icon={Sun}
                    label="Light"
                    active={theme === 'light'}
                    onClick={() => setTheme('light')}
                  />
                  <ThemeOption
                    icon={Moon}
                    label="Dark"
                    active={theme === 'dark'}
                    onClick={() => setTheme('dark')}
                  />
                  <ThemeOption
                    icon={Monitor}
                    label="System"
                    active={theme === 'system'}
                    onClick={() => setTheme('system')}
                  />
                </div>
              </div>
            </SettingSection>

            {/* Notifications Section */}
            <SettingSection
              icon={Bell}
              title="Notifications"
              description="Control how and when you receive alerts and updates."
              accentColor="text-info"
            >
              <div className="space-y-3">
                <ToggleSwitch
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                  label="Email Notifications"
                  description="Receive important updates via email"
                />
                <ToggleSwitch
                  checked={pushNotifications}
                  onChange={setPushNotifications}
                  label="Push Notifications"
                  description="Get real-time browser push alerts"
                />
                <ToggleSwitch
                  checked={weeklyDigest}
                  onChange={setWeeklyDigest}
                  label="Weekly Digest"
                  description="Summary of weekly activities and progress"
                />
                <ToggleSwitch
                  checked={assessmentAlerts}
                  onChange={setAssessmentAlerts}
                  label="Assessment Alerts"
                  description="Notifications for new assessments and deadlines"
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSavePreferences}
                  className="btn-gradient h-9 rounded-lg px-5 text-xs font-semibold"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Preferences
                </Button>
              </div>
            </SettingSection>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
