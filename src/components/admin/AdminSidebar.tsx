import { Ticket, BarChart3, Settings, Building2, Mail, Headset, CreditCard } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import Logo from '@/components/shared/Logo';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const items = [
    { value: 'bookings', icon: Ticket, labelEn: 'Bookings', labelAr: 'الحجوزات' },
    { value: 'reports', icon: BarChart3, labelEn: 'Reports', labelAr: 'التقارير' },
    { value: 'settings', icon: Settings, labelEn: 'Settings', labelAr: 'الإعدادات' },
    { value: 'groups', icon: Building2, labelEn: 'Corporate', labelAr: 'الشركات' },
    { value: 'messages', icon: Mail, labelEn: 'Messages', labelAr: 'الرسائل' },
    { value: 'ayn-support', icon: Headset, labelEn: 'Support', labelAr: 'دعم AYN' },
    { value: 'refunds', icon: CreditCard, labelEn: 'Refunds', labelAr: 'الاسترداد' },
  ];

  return (
    <Sidebar collapsible="icon" className="border-accent/30">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-start')}>
          <Logo />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel>
              {isArabic ? 'القائمة' : 'Navigation'}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = activeTab === item.value;
                const Icon = item.icon;
                const label = isArabic ? item.labelAr : item.labelEn;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      asChild
                      tooltip={label}
                      isActive={isActive}
                    >
                      <button
                        type="button"
                        onClick={() => onTabChange(item.value)}
                        className={cn(
                          'flex items-center gap-2 w-full transition-all',
                          isActive
                            ? 'gradient-gold text-accent-foreground font-medium shadow-md shadow-accent/25'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{label}</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
