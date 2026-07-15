"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  TestTube2,
  FlaskConical,
  Building2,
  Boxes,
  Microscope,
  Receipt,
  Activity,
  Droplet,
  Bell,
  BarChart3,
  Truck,
  ShoppingCart,
  UserCog,
  Settings,
  FileText,
  ListChecks,
  ClipboardCheck,
  Wallet,
  Stethoscope,
  CreditCard,
  PackageSearch,
  Beaker,
  ShieldCheck,
  Landmark,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { dictionaries, type Locale, type NavDictionary, type NavGroupDictionary } from "@/lib/i18n/dictionaries";

type NavLeaf = { href: string; label: string; icon: LucideIcon };
type NavGroup = { id: string; label: string; icon: LucideIcon; children: NavLeaf[] };
type NavNode = NavLeaf | NavGroup;

function isGroup(node: NavNode): node is NavGroup {
  return "children" in node;
}

function buildNavTree(nav: NavDictionary, groups: NavGroupDictionary, isPlatformAdmin: boolean): NavNode[] {
  return [
    { href: "/dashboard", label: nav.dashboard, icon: LayoutDashboard },
    { href: "/reports", label: nav.reports, icon: BarChart3 },
    {
      id: "clinical",
      label: groups.clinical,
      icon: Stethoscope,
      children: [
        { href: "/patients", label: nav.patients, icon: Users },
        { href: "/orders", label: nav.orders, icon: ClipboardList },
        { href: "/specimens", label: nav.specimens, icon: TestTube2 },
        { href: "/results", label: nav.results, icon: FlaskConical },
      ],
    },
    {
      id: "billing",
      label: groups.billing,
      icon: CreditCard,
      children: [
        { href: "/billing", label: nav.billing, icon: Receipt },
        { href: "/quotations", label: nav.quotations, icon: FileText },
      ],
    },
    {
      id: "procurement",
      label: groups.procurement,
      icon: PackageSearch,
      children: [
        { href: "/suppliers", label: nav.suppliers, icon: Truck },
        { href: "/purchase-orders", label: nav.purchaseOrders, icon: ShoppingCart },
        { href: "/rfqs", label: nav.rfqs, icon: ClipboardCheck },
        { href: "/supplier-bills", label: nav.supplierBills, icon: Wallet },
        { href: "/inventory", label: nav.inventory, icon: Boxes },
      ],
    },
    {
      id: "labOps",
      label: groups.labOps,
      icon: Beaker,
      children: [
        { href: "/equipment", label: nav.equipment, icon: Microscope },
        { href: "/qc", label: nav.qc, icon: Activity },
        { href: "/blood-bank", label: nav.bloodBank, icon: Droplet },
      ],
    },
    {
      id: "administration",
      label: groups.administration,
      icon: ShieldCheck,
      children: [
        { href: "/departments", label: nav.departments, icon: Building2 },
        { href: "/staff", label: nav.staff, icon: UserCog },
        { href: "/tests", label: nav.tests, icon: ListChecks },
        { href: "/notifications", label: nav.notifications, icon: Bell },
        { href: "/settings", label: nav.settings, icon: Settings },
        ...(isPlatformAdmin
          ? [{ href: "/admin/tenants", label: nav.tenantManagement, icon: Landmark }]
          : []),
      ],
    },
  ];
}

function isLeafActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function groupContainsActive(pathname: string, group: NavGroup) {
  return group.children.some((child) => isLeafActive(pathname, child.href));
}

export function Sidebar({ locale = "en", isPlatformAdmin = false }: { locale?: Locale; isPlatformAdmin?: boolean }) {
  const pathname = usePathname();
  const dict = dictionaries[locale];
  const navTree = buildNavTree(dict.nav, dict.navGroups, isPlatformAdmin);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const node of navTree) {
      if (isGroup(node) && groupContainsActive(pathname, node)) initial.add(node.id);
    }
    return initial;
  });

  useEffect(() => {
    for (const node of navTree) {
      if (isGroup(node) && groupContainsActive(pathname, node)) {
        setExpanded((prev) => (prev.has(node.id) ? prev : new Set(prev).add(node.id)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FlaskConical size={18} />
        </div>
        <span className="font-semibold text-foreground">EDOS LMIS</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navTree.map((node) => {
          if (!isGroup(node)) {
            const Icon = node.icon;
            const active = isLeafActive(pathname, node.href);
            return (
              <Link
                key={node.href}
                href={node.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <Icon size={18} />
                {node.label}
              </Link>
            );
          }

          const GroupIcon = node.icon;
          const isExpanded = expanded.has(node.id);
          const hasActiveChild = groupContainsActive(pathname, node);
          const Chevron = isExpanded ? ChevronDown : ChevronRight;

          return (
            <div key={node.id}>
              <button
                type="button"
                onClick={() => toggleGroup(node.id)}
                aria-expanded={isExpanded}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  hasActiveChild
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <GroupIcon size={18} />
                <span className="flex-1">{node.label}</span>
                <Chevron size={16} />
              </button>
              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                  {node.children.map((child) => {
                    const ChildIcon = child.icon;
                    const active = isLeafActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                        )}
                      >
                        <ChildIcon size={18} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
