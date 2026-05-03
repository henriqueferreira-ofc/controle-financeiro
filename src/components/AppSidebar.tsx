import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Brain, LayoutDashboard, ListChecks, PiggyBank, Repeat, Tags, Target, Upload, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { AxispayLogo } from "@/components/AxispayLogo";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import { Avatar } from "@/components/ui/avatar";
import { motion } from "framer-motion";

export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();
  const { t } = useI18n();
  
  const isActive = (url: string) => location.pathname === url;
  const handleNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  const avatarUrl = user?.user_metadata?.avatar_url;

  const items = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.records"), url: "/registros", icon: ListChecks },
    { title: t("nav.intelligence"), url: "/inteligencia", icon: Brain },
    { title: t("nav.categories"), url: "/categorias", icon: Tags },
    { title: t("nav.budgets"), url: "/orcamentos", icon: PiggyBank },
    { title: t("nav.goals"), url: "/metas", icon: Target },
    { title: t("nav.recurring"), url: "/recorrentes", icon: Repeat },
    { title: t("nav.import"), url: "/importar", icon: Upload },
    { title: t("nav.reports"), url: "/relatorios", icon: BarChart3 },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-3 pt-5 pb-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-default"
          >
            <AxispayLogo size={36} tagline={t("app.tagline")} />
          </motion.div>
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
                        preload="intent"
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
            <SidebarMenuButton asChild isActive={isActive("/perfil")} className="h-12">
              <Link to="/perfil" onClick={handleNav} className="flex items-center gap-3">
                {avatarUrl ? (
                  <Avatar className="h-6 w-6 border border-border overflow-hidden">
                    <img src={avatarUrl} className="h-full w-full object-cover rounded-full" />
                  </Avatar>
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="truncate">{t("nav.profile")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
