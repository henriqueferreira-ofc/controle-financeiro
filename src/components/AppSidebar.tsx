import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, ListChecks, PiggyBank, Repeat, Tags, Target, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Meus Registros", url: "/registros", icon: ListChecks },
  { title: "Categorias", url: "/categorias", icon: Tags },
  { title: "Orçamentos", url: "/orcamentos", icon: PiggyBank },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Recorrentes", url: "/recorrentes", icon: Repeat },
];

export function AppSidebar() {
  const location = useLocation();
  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 pt-5 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight">FinWise</span>
            <span className="text-xs text-muted-foreground">Controle financeiro</span>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={item.url}
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
              <Link to="/perfil">
                <User className="h-4 w-4" />
                <span>Meu Perfil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
