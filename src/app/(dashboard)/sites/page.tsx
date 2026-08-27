"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Plus, Search, Loader2 } from "lucide-react";
import type { Site, SiteStatus } from "@/types/database";
import Link from "next/link";

const statusColors: Record<SiteStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statusLabels: Record<SiteStatus, string> = {
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
  archived: "Archived",
};

const emptySite = {
  site_name: "",
  site_code: "",
  client_name: "",
  department: "",
  location: "",
  start_date: "",
  end_date: "",
  status: "active" as SiteStatus,
  notes: "",
};

export default function SitesPage() {
  const { isAdmin } = useUser();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [form, setForm] = useState(emptySite);
  const [saving, setSaving] = useState(false);

  async function loadSites() {
    const supabase = createClient();
    let query = supabase.from("sites").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    const { data } = await query;
    setSites((data as Site[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function openCreate() {
    setEditingSite(null);
    setForm(emptySite);
    setDialogOpen(true);
  }

  function openEdit(site: Site) {
    setEditingSite(site);
    setForm({
      site_name: site.site_name,
      site_code: site.site_code,
      client_name: site.client_name ?? "",
      department: site.department ?? "",
      location: site.location ?? "",
      start_date: site.start_date ?? "",
      end_date: site.end_date ?? "",
      status: site.status,
      notes: site.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      site_name: form.site_name,
      site_code: form.site_code,
      client_name: form.client_name || null,
      department: form.department || null,
      location: form.location || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      notes: form.notes || null,
      updated_by: user?.id ?? null,
    };

    if (editingSite) {
      await supabase.from("sites").update(payload).eq("id", editingSite.id);
    } else {
      await supabase.from("sites").insert({ ...payload, created_by: user?.id ?? null });
    }

    setSaving(false);
    setDialogOpen(false);
    loadSites();
  }

  const filtered = sites.filter(
    (s) =>
      s.site_name.toLowerCase().includes(search.toLowerCase()) ||
      s.site_code.toLowerCase().includes(search.toLowerCase()) ||
      (s.client_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader title="Sites" description="Manage your construction sites">
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Site
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v != null && setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sites list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-10 w-10" />}
          title="No sites found"
          description={search ? "Try a different search term." : "Create your first site to get started."}
          action={
            isAdmin && !search ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Site
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((site) => (
            <Link key={site.id} href={`/sites/${site.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">{site.site_name}</CardTitle>
                    <Badge className={`shrink-0 text-xs ${statusColors[site.status]}`}>
                      {statusLabels[site.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{site.site_code}</p>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  {site.client_name && <p>Client: {site.client_name}</p>}
                  {site.location && (
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {site.location}
                    </p>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 -ml-2"
                      onClick={(e) => {
                        e.preventDefault();
                        openEdit(site);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSite ? "Edit Site" : "Add Site"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name *</Label>
                <Input
                  id="site_name"
                  value={form.site_name}
                  onChange={(e) => setForm({ ...form, site_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_code">Site Code *</Label>
                <Input
                  id="site_code"
                  value={form.site_code}
                  onChange={(e) => setForm({ ...form, site_code: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: (v ?? "") as SiteStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSite ? "Save Changes" : "Create Site"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
