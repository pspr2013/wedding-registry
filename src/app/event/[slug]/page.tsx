"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function GuestForm() {
  const { slug } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [usd, setUsd] = useState("");
  const [khr, setKhr] = useState("");
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);

  // Progress Bar State
  const [totalCollected, setTotalCollected] = useState(0);
  const GOAL_USD = 10000;

  useEffect(() => {
    const fetchTotals = async () => {
      const { data, error } = await supabase
        .from("gifts")
        .select("amount_usd, amount_khr, status")
        .eq("status", "approved");

      if (data && !error) {
        let total = 0;
        data.forEach(gift => {
          total += (gift.amount_usd || 0);
          // Note: KHR is ignored for the simple progress bar goal, or we could convert it.
          // Let's just sum USD for now to keep it simple.
        });
        setTotalCollected(total);
      }
    };
    fetchTotals();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usd && !khr) {
      alert("Please enter at least one amount (USD or KHR).");
      return;
    }
    
    setLoading(true);

    try {
      let slip_url = "";
      
      // 1. Upload Slip if provided
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from("slips")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("slips")
          .getPublicUrl(filePath);
          
        slip_url = publicUrl;
      }

      // 2. Insert record
      const { error: insertError } = await supabase
        .from("gifts")
        .insert({
          guest_name: name,
          amount_usd: usd ? parseFloat(usd) : 0,
          amount_khr: khr ? parseFloat(khr) : 0,
          transfer_date: transferDate || null,
          slip_url,
          status: "pending"
        });

      if (insertError) throw insertError;

      // Trigger Telegram Notification for New Submission
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            guest_name: name,
            amount_usd: usd ? parseFloat(usd) : 0,
            amount_khr: khr ? parseFloat(khr) : 0,
            transfer_date: transferDate || null,
            type: "submitted"
          }),
        });
      } catch (notifyError) {
        console.error("Failed to send telegram notification:", notifyError);
      }

      alert(`ជូនពរអ្នកទទួលបានជោគជ័យ! ចំណងដៃត្រូវបានកត់ត្រាទុកដោយជោគជ័យ។ (Gift successfully recorded)`);
      
      // Reset form
      setName("");
      setUsd("");
      setKhr("");
      setTransferDate(new Date().toISOString().split('T')[0]);
      setFile(null);

    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message || "An error occurred while submitting."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-rose-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-rose-800 font-heading">
            កត់ចំណងដៃ (Gift Registry)
          </CardTitle>
          <CardDescription>
            សម្រាប់កម្មវិធី (For Event): {slug}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-rose-700">Progress</span>
              <span className="text-rose-700">${totalCollected.toLocaleString()} / ${GOAL_USD.toLocaleString()}</span>
            </div>
            <div className="w-full bg-rose-100 rounded-full h-2.5">
              <div 
                className="bg-rose-500 h-2.5 rounded-full" 
                style={{ width: `${Math.min((totalCollected / GOAL_USD) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">ឈ្មោះភ្ញៀវ (Guest Name) *</Label>
              <Input 
                id="name" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ឧទាហរណ៍: សុខ សាន្ត" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usd">ចំនួនប្រាក់ដុល្លារ (Amount USD)</Label>
              <Input 
                id="usd" 
                type="number" 
                min="0" 
                step="0.01" 
                value={usd}
                onChange={(e) => setUsd(e.target.value)}
                placeholder="$ 0.00" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="khr">ចំនួនប្រាក់រៀល (Amount KHR)</Label>
              <Input 
                id="khr" 
                type="number" 
                min="0" 
                step="100" 
                value={khr}
                onChange={(e) => setKhr(e.target.value)}
                placeholder="៛ 0" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferDate">កាលបរិច្ឆេទផ្ទេរប្រាក់ (Transfer Date)</Label>
              <Input 
                id="transferDate" 
                type="date" 
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slip">វិក្កយបត្របង់ប្រាក់ (Payment Slip)</Label>
              <Input 
                id="slip" 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
            </div>
            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white" disabled={loading}>
              {loading ? "កំពុងរក្សាទុក..." : "បញ្ជូន (Submit)"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
