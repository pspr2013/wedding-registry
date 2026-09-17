"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [authError, setAuthError] = useState("");

  // New user form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("host"); // 'host' or 'admin'
  const [isCreating, setIsCreating] = useState(false);

  // Edit user state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const verifySuperAdmin = async (currentSession: any) => {
    setLoading(true);
    const userEmail = currentSession?.user?.email || "";
    
    if (userEmail === "admin@wedding.com") {
      setSession(currentSession);
      setAuthError("");
      fetchUsers(currentSession.access_token);
    } else {
      setSession(null);
      setAuthError("Access Denied: Only the super admin (admin@wedding.com) can manage users.");
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        verifySuperAdmin(session);
      } else {
        setSession(null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        verifySuperAdmin(session);
      } else {
        setSession(null);
        setAuthError("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUsers = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err: any) {
      alert("Failed to fetch users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newRole) return;
    
    setIsCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert("User created successfully!");
      setNewEmail("");
      setNewPassword("");
      setNewRole("host");
      fetchUsers(session.access_token);
    } catch (err: any) {
      alert("Failed to create user: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id, password: editPassword, role: editRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert("User updated successfully!");
      setEditingId(null);
      setEditPassword("");
      fetchUsers(session.access_token);
    } catch (err: any) {
      alert("Failed to update user: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert("User deleted successfully!");
      fetchUsers(session.access_token);
    } catch (err: any) {
      alert("Failed to delete user: " + err.message);
    }
  };

  if (!session) {
    if (authError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg border-red-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-slate-700">{authError}</p>
              <Button onClick={() => supabase.auth.signOut()} variant="outline" className="w-full">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
            <CardDescription>Sign in to access the user management dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Same login behavior as main admin page, but relies on existing session */}
            <p className="text-center text-gray-500 mb-4">Please log in via the main admin dashboard.</p>
            <Link href="/admin">
              <Button className="w-full">Go to Admin Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">User Management</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          <span className="text-sm text-gray-500">{session.user.email}</span>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Sign Out</Button>
        </div>
      </div>

      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Account</CardTitle>
          <CardDescription>Create a new admin or host account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@wedding.com" className="w-64" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-64" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select 
                className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
              >
                <option value="host">Host</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={isCreating}>{isCreating ? "Creating..." : "Create User"}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-700">Email</th>
              <th className="p-4 font-medium text-gray-700">Role</th>
              <th className="p-4 font-medium text-gray-700">Created At</th>
              <th className="p-4 font-medium text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-900">{user.email}</td>
                <td className="p-4">
                  {editingId === user.id ? (
                    <select 
                      className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                    >
                      <option value="host">Host</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="capitalize">{user.user_metadata?.role || (user.email.includes("admin") ? "admin" : "host")}</span>
                  )}
                </td>
                <td className="p-4 text-gray-500">{new Date(user.created_at).toLocaleString()}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    {user.email === "admin@wedding.com" ? (
                      <span className="text-gray-400 italic text-xs">Super Admin</span>
                    ) : editingId === user.id ? (
                      <>
                        <Input 
                          type="password" 
                          placeholder="New Password (optional)" 
                          value={editPassword} 
                          onChange={e => setEditPassword(e.target.value)} 
                          className="h-8 w-40" 
                        />
                        <Button size="sm" onClick={() => handleSaveEdit(user.id)} disabled={isUpdating}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => {
                          setEditingId(user.id);
                          setEditRole(user.user_metadata?.role || (user.email.includes("admin") ? "admin" : "host"));
                          setEditPassword("");
                        }}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>Delete</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
