import { Ticket, BarChart3, Settings, Building2, Mail, Headset, CreditCard } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  // Grouped to mirror the Supabase reference (dividers between groups)
  const groups = [
    [
      { value: 'bookings', icon: Ticket, labelEn: 'Bookings', labelAr: 'الحجوزات' },
      { value: 'reports', icon: BarChart3, labelEn: 'Reports', labelAr: 'التقارير' },
    ],
    [
      { value: 'groups', icon: Building2, labelEn: 'Corporate', labelAr: 'الشركات' },
      { value: 'messages', icon: Mail, labelEn: 'Messages', labelAr: 'الرسائل' },
      { value: 'ayn-support', icon: Headset, labelEn: 'Support', labelAr: 'دعم AYN' },
    ],
    [
      { value: 'refunds', icon: CreditCard, labelEn: 'Refunds', labelAr: 'الاسترداد' },
      { value: 'settings', icon: Settings, labelEn: 'Settings', labelAr: 'الإعدادات' },
    ],
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/40 [&>div]:bg-sidebar"
    >
      <SidebarContent className="bg-sidebar py-3 gap-0">
        {groups.map((items, gIdx) => (
          <div key={gIdx}>
            <SidebarGroup className="py-1">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {items.map((item) => {
                    const isActive = activeTab === item.value;
                    const Icon = item.icon;
                    const label = isArabic ? item.labelAr : item.labelEn;
                    return (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          tooltip={label}
                          isActive={isActive}
                          onClick={() => onTabChange(item.value)}
                          className={cn(
                            'h-9 w-9 mx-auto justify-center rounded-md p-0 transition-colors',
                            '[&>svg]:size-5 [&>span:last-child]:sr-only',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                          )}
                        >
                          <Icon />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {gIdx < groups.length - 1 && (
              <div className="mx-3 my-2 h-px bg-sidebar-border/60" />
            )}
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
