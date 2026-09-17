"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { db, Gift } from "@/lib/db/dexie";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminDashboard() {
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hostFilter, setHostFilter] = useState("all");
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsd, setEditUsd] = useState("");
  const [editKhr, setEditKhr] = useState("");
  const [editTransferDate, setEditTransferDate] = useState("");
  
  // Auth state
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const verifyAdmin = async (currentSession: any) => {
    setLoading(true);
    const userEmail = currentSession?.user?.email || "";
    const userRole = currentSession?.user?.user_metadata?.role;
    
    if (userEmail.toLowerCase().includes("admin") || userRole === 'admin') {
      setSession(currentSession);
      setAuthError("");
      fetchGifts();
    } else {
      setSession(null);
      setAuthError("Access Denied: You must use an Admin account to access this dashboard. You are currently logged in as " + userEmail);
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        verifyAdmin(session);
      } else {
        setSession(null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        verifyAdmin(session);
      } else {
        setSession(null);
        setAuthError("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setAuthLoading(false);
    
    if (error) {
      alert("Login Error: " + error.message);
      return;
    }
    
    const userEmail = data?.user?.email || "";
    const userRole = data?.user?.user_metadata?.role;
    
    if (!userEmail.toLowerCase().includes("admin") && userRole !== 'admin') {
      alert("Login Error: You must use an Admin account to log in to this dashboard.");
      await supabase.auth.signOut();
    }
  };

  const fetchGifts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gifts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGifts(data || []);
      
      // Cache approved gifts in Dexie
      const approvedGifts = (data || []).filter(g => g.status === 'approved') as Gift[];
      await db.gifts.clear(); // simple full refresh for demo
      if (approvedGifts.length > 0) {
        await db.gifts.bulkPut(approvedGifts);
      }
    } catch (error: any) {
      console.error("Error fetching gifts:", error);
      if (error.message) alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from("gifts")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      
      // Trigger telegram notification on approval
      if (status === 'approved') {
        const giftToApprove = gifts.find(g => g.id === id);
        
        const totalUsd = gifts
           .filter(g => g.status === 'approved' || g.id === id)
           .reduce((acc, curr) => acc + (Number(curr.amount_usd) || 0), 0);

        const totalKhr = gifts
           .filter(g => g.status === 'approved' || g.id === id)
           .reduce((acc, curr) => acc + (Number(curr.amount_khr) || 0), 0);

        if (giftToApprove) {
          console.log("Triggering telegram notification for id:", id);
          alert("Approving gift and sending telegram notification!");
          fetch('/api/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              guest_name: giftToApprove.guest_name,
              amount_usd: giftToApprove.amount_usd,
              amount_khr: giftToApprove.amount_khr,
              totalUsd: totalUsd,
              totalKhr: totalKhr,
              event_id: giftToApprove.event_id
            })
          }).then(res => {
              console.log("Fetch response:", res.status);
              if (!res.ok) alert("Failed to notify telegram. Check console.");
          }).catch(err => {
              console.error("Failed to notify Telegram:", err);
              alert("Network error trying to notify telegram.");
          });
        }
      }

      await fetchGifts();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const parsedUsd = parseFloat(editUsd) || 0;
      const parsedKhr = parseFloat(editKhr) || 0;
      
      const { error } = await supabase
        .from("gifts")
        .update({ 
          amount_usd: parsedUsd,
          amount_khr: parsedKhr,
          transfer_date: editTransferDate || null
        })
        .eq("id", id);
        
      if (error) throw error;
      
      const editedGift = gifts.find(g => g.id === id);
      setEditingId(null);
      await fetchGifts();
      
      if (editedGift && editedGift.status === 'approved') {
         // Calculate new totals with the updated amounts (simulating what fetchGifts just got)
         const totalUsd = gifts.filter(g => g.status === 'approved').reduce((acc, curr) => acc + (curr.id === id ? parsedUsd : (Number(curr.amount_usd) || 0)), 0);
         const totalKhr = gifts.filter(g => g.status === 'approved').reduce((acc, curr) => acc + (curr.id === id ? parsedKhr : (Number(curr.amount_khr) || 0)), 0);

         fetch('/api/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              guest_name: editedGift.guest_name,
              amount_usd: parsedUsd,
              amount_khr: parsedKhr,
              old_amount_usd: editedGift.amount_usd,
              old_amount_khr: editedGift.amount_khr,
              totalUsd: totalUsd,
              totalKhr: totalKhr,
              type: "edited",
              event_id: editedGift.event_id
            })
          }).catch(err => console.error("Failed to notify Telegram about edit:", err));
      }
      
    } catch (error) {
      console.error("Error updating gift:", error);
      alert("Failed to update gift");
    }
  };

  const exportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gifts));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "wedding_gifts_backup.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportCSV = () => {
    const headers = ["Guest Name", "Host Email", "USD Amount", "KHR Amount", "Status", "Date Submitted", "Transfer Date"];
    const csvContent = [
      headers.join(","),
      ...gifts.map(g => [
        `"${(g.guest_name || "").replace(/"/g, '""')}"`,
        `"${(g.host_email || "").replace(/"/g, '""')}"`,
        g.amount_usd || 0,
        g.amount_khr || 0,
        g.status,
        `"${new Date(g.created_at).toLocaleString()}"`,
        `"${g.transfer_date || ""}"`
      ].join(","))
    ].join("\n");

    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + csvContent);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "wedding_gifts_export.csv");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
            <CardDescription>Sign in to access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@wedding.com" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? "Signing in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="p-8">កំពុងទាញយកទិន្នន័យ (Loading)...</div>;

  const filteredGifts = gifts.filter((gift) => {
    const matchesSearch = gift.guest_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || gift.status === statusFilter;
    const matchesHost = hostFilter === "all" || gift.host_email === hostFilter;
    return matchesSearch && matchesStatus && matchesHost;
  });

  const uniqueHosts = Array.from(new Set(gifts.map(g => g.host_email).filter(Boolean)));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session.user.email}</span>
          {session.user.email === "admin@wedding.com" && (
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/users'}>
              Manage Users
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Sign Out</Button>
          <Button onClick={() => {
            alert("Testing Telegram...");
            
            const totalUsd = gifts
               .filter(g => g.status === 'approved')
               .reduce((acc, curr) => acc + (Number(curr.amount_usd) || 0), 0);
               
            const totalKhr = gifts
               .filter(g => g.status === 'approved')
               .reduce((acc, curr) => acc + (Number(curr.amount_khr) || 0), 0);
               
            fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                guest_name: gifts[0]?.guest_name || "Test Guest",
                amount_usd: gifts[0]?.amount_usd ?? 100,
                amount_khr: gifts[0]?.amount_khr ?? 400000,
                totalUsd: totalUsd,
                totalKhr: totalKhr,
                event_id: gifts[0]?.event_id
              })
            }).then(res => {
              if (res.ok) alert("Telegram message sent successfully!");
              else alert("Failed to send. Error code: " + res.status);
            }).catch(e => alert("Network error: " + e.message));
          }} variant="secondary">
            Test Telegram Alert
          </Button>
          <Button onClick={exportCSV} variant="default" className="bg-green-600 hover:bg-green-700 text-white">
            Export to CSV
          </Button>
          <Button onClick={exportBackup} variant="outline">
            Export Local Backup (JSON)
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Input
          placeholder="ស្វែងរកឈ្មោះ (Search name)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64"
        />
        <select
          className="flex h-10 w-full sm:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">ទាំងអស់ (All)</option>
          <option value="pending">រង់ចាំ (Pending)</option>
          <option value="approved">អនុម័ត (Approved)</option>
          <option value="rejected">បដិសេធ (Rejected)</option>
        </select>
        <select
          className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={hostFilter}
          onChange={(e) => setHostFilter(e.target.value)}
        >
          <option value="all">គ្រប់អ្នកអញ្ជើញ (All Hosts)</option>
          {uniqueHosts.map(host => (
            <option key={host as string} value={host as string}>{host as string}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-700">Guest Name</th>
              <th className="p-4 font-medium text-gray-700">Host</th>
              <th className="p-4 font-medium text-gray-700">USD</th>
              <th className="p-4 font-medium text-gray-700">KHR</th>
              <th className="p-4 font-medium text-gray-700">Status</th>
              <th className="p-4 font-medium text-gray-700">Date</th>
              <th className="p-4 font-medium text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGifts.map(gift => (
              <tr key={gift.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-900">{gift.guest_name}</td>
                <td className="p-4 text-gray-600 text-xs">{gift.host_email || '—'}</td>
                <td className="p-4">
                  {editingId === gift.id ? (
                    <Input type="number" value={editUsd} onChange={(e) => setEditUsd(e.target.value)} className="w-24 h-8" />
                  ) : (
                    <span className="text-gray-700">${gift.amount_usd}</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === gift.id ? (
                    <Input type="number" value={editKhr} onChange={(e) => setEditKhr(e.target.value)} className="w-32 h-8" />
                  ) : (
                    <span className="text-gray-700">៛{Number(gift.amount_khr || 0).toLocaleString()}</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    gift.status === 'approved' ? 'bg-green-100 text-green-800' :
                    gift.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {gift.status}
                  </span>
                </td>
                <td className="p-4 text-gray-500">
                  {editingId === gift.id ? (
                    <Input type="date" value={editTransferDate} onChange={(e) => setEditTransferDate(e.target.value)} className="w-36 h-8" />
                  ) : (
                    <div className="flex flex-col">
                      <span>{new Date(gift.created_at).toLocaleString()}</span>
                      {gift.transfer_date && <span className="text-xs text-gray-400">Tr: {gift.transfer_date}</span>}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === gift.id ? (
                      <>
                        <Button size="sm" onClick={() => handleSaveEdit(gift.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => {
                          setEditingId(gift.id);
                          setEditUsd(gift.amount_usd?.toString() || "0");
                          setEditKhr(gift.amount_khr?.toString() || "0");
                          setEditTransferDate(gift.transfer_date || "");
                        }}>Edit</Button>
                        {gift.status === 'pending' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateStatus(gift.id, 'approved')}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(gift.id, 'rejected')}>Reject</Button>
                          </>
                        )}
                        {gift.slip_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(gift.slip_url, '_blank')}>
                            View Slip
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredGifts.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  មិនទាន់មានទិន្នន័យ (No data found)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
