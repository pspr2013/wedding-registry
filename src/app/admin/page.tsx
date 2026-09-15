"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { db, Gift } from "@/lib/db/dexie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGifts();
  }, []);

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
    } catch (error) {
      console.error("Error fetching gifts:", error);
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
      await fetchGifts();
    } catch (error) {
      console.error("Error updating status:", error);
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

  if (loading) return <div className="p-8">កំពុងទាញយកទិន្នន័យ (Loading)...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Admin Dashboard</h1>
        <Button onClick={exportBackup} variant="outline">
          Export Local Backup (JSON)
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {gifts.map(gift => (
          <Card key={gift.id}>
            <CardHeader className="py-4">
              <CardTitle className="text-lg flex justify-between">
                <span>{gift.guest_name}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {new Date(gift.created_at).toLocaleString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                <div><strong>USD:</strong> ${gift.amount_usd}</div>
                <div><strong>KHR:</strong> ៛{gift.amount_khr}</div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span className={`px-2 py-1 rounded text-sm ${
                    gift.status === 'approved' ? 'bg-green-100 text-green-800' :
                    gift.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {gift.status}
                  </span>
                </div>
                <div className="flex space-x-2 justify-end">
                  {gift.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => handleUpdateStatus(gift.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(gift.id, 'rejected')}>Reject</Button>
                    </>
                  )}
                  {gift.slip_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={gift.slip_url} target="_blank" rel="noreferrer">View Slip</a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
