"use client";

import { useSiteFilter } from "@/hooks/use-site-filter";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SiteSelector } from "@/components/site-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Loader2, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { MaterialPurchase, MaterialPurchaseItem, PurchasePaymentStatus } from "@/types/database";

interface PurchaseWithItems extends MaterialPurchase {
  material_purchase_items: MaterialPurchaseItem[];
  vendors?: { name: string } | null;
}

interface LineItem {
  material_name: string;
  quantity: string;
  unit: string;
  rate: string;
}

export default function MaterialsPage() {
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useSiteFilter("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    site_id: "",
    vendor_id: "",
    purchase_date: new Date().toISOString().slice(0, 10),
    invoice_number: "",
    payment_status: "unpaid" as PurchasePaymentStatus,
    notes: "",
  });
  const [items, setItems] = useState<LineItem[]>([
    { material_name: "", quantity: "", unit: "bags", rate: "" },
  ]);

  async function loadData() {
    const supabase = createClient();
    let query = supabase
      .from("material_purchases")
      .select("*, material_purchase_items(*), vendors(name)")
      .order("purchase_date", { ascending: false });
    if (siteFilter !== "all") query = query.eq("site_id", siteFilter);
    const { data } = await query;
    setPurchases((data as PurchaseWithItems[]) ?? []);

    const { data: vendorData } = await supabase.from("vendors").select("id, name").order("name");
    setVendors(vendorData ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [siteFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setForm({
      site_id: siteFilter === "all" ? "" : siteFilter,
      vendor_id: "",
      purchase_date: new Date().toISOString().slice(0, 10),
      invoice_number: "",
      payment_status: "unpaid",
      notes: "",
    });
    setItems([{ material_name: "", quantity: "", unit: "bags", rate: "" }]);
    setDialogOpen(true);
  }

  function addItem() {
    setItems([...items, { material_name: "", quantity: "", unit: "bags", rate: "" }]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: purchase } = await supabase
      .from("material_purchases")
      .insert({
        site_id: form.site_id,
        vendor_id: form.vendor_id || null,
        purchase_date: form.purchase_date,
        invoice_number: form.invoice_number || null,
        payment_status: form.payment_status,
        notes: form.notes || null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      })
      .select()
      .single();

    if (purchase) {
      const lineItems = items
        .filter((i) => i.material_name && i.quantity && i.rate)
        .map((i) => ({
          purchase_id: purchase.id,
          material_name: i.material_name,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          rate: parseFloat(i.rate),
        }));

      if (lineItems.length > 0) {
        await supabase.from("material_purchase_items").insert(lineItems);
      }
    }

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  async function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: vendor } = await supabase
      .from("vendors")
      .insert({
        name: newVendorName.trim(),
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      })
      .select()
      .single();

    if (vendor) {
      setVendors((prev) => [...prev, vendor].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, vendor_id: vendor.id }));
    }
    setSaving(false);
    setVendorDialogOpen(false);
    setNewVendorName("");
  }

  const grandTotal = purchases.reduce(
    (sum, p) => sum + p.material_purchase_items.reduce((s, i) => s + Number(i.amount ?? 0), 0),
    0
  );

  return (
    <>
      <PageHeader title="Material Purchases" description={`Total: ${formatCurrency(grandTotal)}`}>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Purchase</Button>
      </PageHeader>

      <div className="flex gap-3 mb-6">
        <SiteSelector value={siteFilter} onChange={setSiteFilter} includeAll className="w-full sm:w-52" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : purchases.length === 0 ? (
        <EmptyState icon={<Package className="h-10 w-10" />} title="No purchases" description="Record material purchases." />
      ) : (
        <div className="space-y-4">
          {purchases.map((p) => {
            const total = p.material_purchase_items.reduce((s, i) => s + Number(i.amount ?? 0), 0);
            return (
              <div key={p.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{formatDate(p.purchase_date)}</span>
                    {p.vendors?.name && (
                      <span className="text-muted-foreground ml-2">· {p.vendors.name}</span>
                    )}
                    {p.invoice_number && (
                      <span className="text-xs text-muted-foreground ml-2">#{p.invoice_number}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{p.payment_status.replace("_", " ")}</Badge>
                    <span className="font-bold">{formatCurrency(total)}</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.material_purchase_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.material_name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Material Purchase</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Site *</Label>
                <SiteSelector value={form.site_id} onChange={(v) => setForm({ ...form, site_id: v })} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Vendor</Label>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setVendorDialogOpen(true)}>
                    + New
                  </Button>
                </div>
                <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Invoice #</Label>
                <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={form.payment_status} onValueChange={(v) => setForm({ ...form, payment_status: (v ?? "") as PurchasePaymentStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </div>
              <div className="space-y-4 sm:space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-end p-3 sm:p-0 border sm:border-0 rounded-md bg-muted/20 sm:bg-transparent">
                    <div className="flex-1 space-y-1">
                      <Label className="sm:hidden text-xs text-muted-foreground">Material Name</Label>
                      <Input placeholder="Material" className="w-full" value={item.material_name} onChange={(e) => updateItem(idx, "material_name", e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 sm:w-20 space-y-1">
                        <Label className="sm:hidden text-xs text-muted-foreground">Qty</Label>
                        <Input placeholder="Qty" type="number" className="w-full" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                      </div>
                      <div className="flex-1 sm:w-20 space-y-1">
                        <Label className="sm:hidden text-xs text-muted-foreground">Unit</Label>
                        <Input placeholder="Unit" className="w-full" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                      </div>
                      <div className="flex-1 sm:w-24 space-y-1">
                        <Label className="sm:hidden text-xs text-muted-foreground">Rate</Label>
                        <Input placeholder="Rate" type="number" className="w-full" value={item.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 sm:mt-0 sm:w-32">
                      <div className="sm:text-right flex-1">
                        <Label className="sm:hidden text-xs text-muted-foreground block mb-1">Amount</Label>
                        <span className="text-sm font-medium">
                          {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0))}
                        </span>
                      </div>
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-right font-bold mt-2">
                Total: {formatCurrency(items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0), 0))}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Purchase
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Vendor</DialogTitle></DialogHeader>
          <form onSubmit={handleAddVendor} className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input 
                value={newVendorName} 
                onChange={(e) => setNewVendorName(e.target.value)} 
                required 
                placeholder="e.g. ABC Cements"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !newVendorName.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Vendor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
