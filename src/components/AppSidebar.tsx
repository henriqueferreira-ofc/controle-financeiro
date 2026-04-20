import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import { Brain, LayoutDashboard, ListChecks, PiggyBank, Repeat, Tags, Target, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { AxispayLogo } from "@/components/AxispayLogo";
import { useI18n } from "@/i18n/I18nProvider";

export function AppSidebar() {
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const { t } = useI18n();
  const isActive = (url: string) => location.pathname === url;
  const handleNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  const items = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.records"), url: "/registros", icon: ListChecks },
    { title: t("nav.intelligence"), url: "/inteligencia", icon: Brain },
    { title: t("nav.categories"), url: "/categorias", icon: Tags },
    { title: t("nav.budgets"), url: "/orcamentos", icon: PiggyBank },
    { title: t("nav.goals"), url: "/metas", icon: Target },
    { title: t("nav.recurring"), url: "/recorrentes", icon: Repeat },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-3 pt-5 pb-3">
          <AxispayLogo size={36} tagline={t("app.tagline")} />
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={item.url}
                        onClick={handleNav}
                        className={cn(
                          "transition-all",
                          active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/perfil")}>
              <Link to="/perfil" onClick={handleNav}>
                <User className="h-4 w-4" />
                <span>{t("nav.profile")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
