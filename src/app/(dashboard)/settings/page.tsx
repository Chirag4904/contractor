"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Settings as SettingsIcon, Loader2, Plus } from "lucide-react";
import type { Profile, UserRole } from "@/types/database";

export default function SettingsPage() {
  const { profile, isAdmin } = useUser();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("user");

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  
  const [removeUserTarget, setRemoveUserTarget] = useState<Profile | null>(null);
  const [removingUser, setRemovingUser] = useState(false);


  useEffect(() => {
    if (profile) setName(profile.full_name ?? "");
  }, [profile]);

  async function saveProfile() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ full_name: name }).eq("id", profile!.id);
    setSaving(false);
  }

  async function loadUsers() {
    if (!isAdmin) return;
    setLoadingUsers(true);
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").order("created_at");
    setUsers((data as Profile[]) ?? []);
    setLoadingUsers(false);
  }

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  
  async function handleFactoryReset() {
    if (resetConfirm !== "RESET") return;
    setResetting(true);
    const supabase = createClient();
    const dummyId = "00000000-0000-0000-0000-000000000000";
    
    // Delete in order to satisfy foreign key constraints
    await supabase.from("material_purchase_items").delete().neq("id", dummyId);
    await supabase.from("material_purchases").delete().neq("id", dummyId);
    await supabase.from("bank_payments").delete().neq("id", dummyId);
    await supabase.from("cash_expenses").delete().neq("id", dummyId);
    await supabase.from("advances").delete().neq("id", dummyId);
    await supabase.from("labour_payments").delete().neq("id", dummyId);
    await supabase.from("attendance").delete().neq("id", dummyId);
    await supabase.from("labour").delete().neq("id", dummyId);
    await supabase.from("vendors").delete().neq("id", dummyId);
    await supabase.from("sites").delete().neq("id", dummyId);

    setResetting(false);
    setResetDialogOpen(false);
    window.location.reload();
  }

  async function handleRemoveUser() {
    if (!removeUserTarget) return;
    setRemovingUser(true);
    const supabase = createClient();
    // This removes them from the public.profiles table, effectively removing their app access.
    // Full removal requires deleting from auth.users via Supabase Dashboard.
    await supabase.from("profiles").delete().eq("id", removeUserTarget.id);
    setRemovingUser(false);
    setRemoveUserTarget(null);
    loadUsers();
  }

  async function updateUserRole() {
    if (!editUser) return;
    const supabase = createClient();
    await supabase.from("profiles").update({ role: editRole }).eq("id", editUser.id);
    setEditUser(null);
    loadUsers();
  }

  return (
    <>
      <PageHeader title="Settings" />

      <div className="max-w-2xl space-y-6">
        <Card className="border-muted bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your personal information and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="profile_name">Full Name</Label>
              <Input
                id="profile_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-md"
              />
      
        {isAdmin && (
          <Card className="border-destructive/50 bg-destructive/5 text-destructive shadow-sm">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription className="text-destructive/80">Irreversible, destructive actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Factory Reset will permanently delete all Sites, Labourers, Vendors, and all related transactions (Attendance, Advances, Payments, Expenses, etc). Only registered User accounts will remain.
              </p>
            </CardContent>
            <CardFooter className="border-t border-destructive/20 bg-destructive/10 px-6 py-4">
              <Button variant="destructive" onClick={() => setResetDialogOpen(true)} className="ml-auto">
                Factory Reset Data
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

            <div className="space-y-1">
              <Label>Role</Label>
              <p className="text-sm font-medium text-muted-foreground capitalize">{profile?.role ?? "user"}</p>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 px-6 py-4">
            <Button onClick={saveProfile} disabled={saving} className="ml-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        {isAdmin && (
          <Card className="border-muted shadow-sm">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system access and assign roles to team members.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className="capitalize">
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditUser(u);
                              setEditRole(u.role);
                            }}
                            className="mr-2"
                          >
                            Edit Role
                          </Button>
                          {u.id !== profile?.id && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setRemoveUserTarget(u)}
                            >
                              Remove
                            </Button>
                          )}

                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role — {editUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={updateUserRole}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Factory Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md border-destructive">
          <DialogHeader>
            <DialogTitle className="text-destructive">Factory Reset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-medium text-destructive">
              This action cannot be undone. This will permanently delete all Sites, Vendors, Labourers, Attendance, Advances, and all other financial transactions.
            </p>
            <div className="space-y-2">
              <Label>Type "RESET" to confirm</Label>
              <Input
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="RESET"
                className="border-destructive/50 focus-visible:ring-destructive"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleFactoryReset} 
                disabled={resetConfirm !== "RESET" || resetting}
              >
                {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Deletion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={!!removeUserTarget} onOpenChange={(o) => !o && setRemoveUserTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <strong>{removeUserTarget?.full_name}</strong>? They will immediately lose access to the application.
            </p>
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Note: This removes their app profile. To completely delete their login identity, remove them from the Supabase Authentication Dashboard.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoveUserTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRemoveUser} disabled={removingUser}>
                {removingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>

  );
}
