"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { supabase } from "@/lib/supabase/client";
import { db, Gift } from "@/lib/db/dexie";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HostDashboard() {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  
  // Auth state
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  
  // Observe local offline cache automatically
  const cachedGifts = useLiveQuery(() => db.gifts.toArray());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchApprovedGifts();
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchApprovedGifts();
    });
    
    // Setup online/offline listeners
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setAuthLoading(false);
    if (error) {
      alert("Login Error: " + error.message);
    }
  };

  const fetchApprovedGifts = async () => {
    if (!navigator.onLine) {
      setOnline(false);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gifts")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Update local cache
      if (data && data.length > 0) {
        await db.gifts.clear();
        await db.gifts.bulkPut(data as Gift[]);
      }
    } catch (error) {
      console.error("Error fetching gifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const gifts = cachedGifts || [];
  
  const totalUSD = gifts.reduce((sum, gift) => sum + (gift.amount_usd || 0), 0);
  const totalKHR = gifts.reduce((sum, gift) => sum + (gift.amount_khr || 0), 0);

  const exportReport = () => {
    // Basic CSV Export
    const csvRows = [
      ["ID", "Guest Name", "USD", "KHR", "Date"]
    ];
    gifts.forEach(g => {
      csvRows.push([g.id, g.guest_name, g.amount_usd.toString(), g.amount_khr.toString(), new Date(g.created_at).toLocaleString()]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "wedding_report.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-rose-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-rose-800">Host Login</CardTitle>
            <CardDescription>Sign in to view the wedding gifts</CardDescription>
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
                  placeholder="host@wedding.com" 
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
              <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={authLoading}>
                {authLoading ? "Signing in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && gifts.length === 0) return <div className="p-8">កំពុងទាញយកទិន្នន័យ (Loading)...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-rose-800">Host Dashboard</h1>
          {!online && <p className="text-red-500 font-semibold">Offline Mode - Viewing Cached Data</p>}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session.user.email}</span>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Sign Out</Button>
          <Button onClick={exportReport} variant="default" className="bg-rose-600 hover:bg-rose-700 text-white">
            Export Report (CSV)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-700">សរុបប្រាក់ដុល្លារ (Total USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">${totalUSD.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-700">សរុបប្រាក់រៀល (Total KHR)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">៛{totalKHR.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-heading font-bold mt-8 mb-4">បញ្ជីចំណងដៃ (Approved Gifts)</h2>
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium">ឈ្មោះ (Guest Name)</th>
              <th className="p-4 font-medium">USD</th>
              <th className="p-4 font-medium">KHR</th>
              <th className="p-4 font-medium">កាលបរិច្ឆេទ (Date)</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map(gift => (
              <tr key={gift.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium">{gift.guest_name}</td>
                <td className="p-4">${gift.amount_usd}</td>
                <td className="p-4">៛{gift.amount_khr.toLocaleString()}</td>
                <td className="p-4 text-muted-foreground">{new Date(gift.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {gifts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">មិនទាន់មានទិន្នន័យ (No data yet)</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
