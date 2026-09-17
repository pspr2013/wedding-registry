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
  const [transferDate, setTransferDate] = useState("");

  useEffect(() => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    setTransferDate(new Date(Date.now() - tzoffset).toISOString().slice(0, 19));
  }, []);
  const [file, setFile] = useState<File | null>(null);
  
  // Host Selection
  const [hosts, setHosts] = useState<{email: string, name?: string}[]>([]);
  const [selectedHost, setSelectedHost] = useState("");

  const formatHostName = (email: string) => {
    let name = email.split('@')[0];
    if (name.startsWith('admin_')) {
      name = name.replace('admin_', '');
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Progress Bar State
  const [totalCollected, setTotalCollected] = useState(0);
  const GOAL_USD = 10000;

  const [eventId, setEventId] = useState<string | null>(null);
  const [eventNotFound, setEventNotFound] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const fetchEventAndTotals = async () => {
      // 1. Fetch Event ID
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id")
        .eq("slug", slug)
        .single();

      if (eventError || !eventData) {
        console.error("Event not found:", eventError);
        setEventNotFound(true);
        setIsInitializing(false);
        return;
      }
      setEventId(eventData.id);

      // 2. Fetch Totals for THIS event
      const { data: giftsData, error: giftsError } = await supabase
        .from("gifts")
        .select("amount_usd, status")
        .eq("status", "approved")
        .eq("event_slug", slug);

      if (giftsData && !giftsError) {
        let total = 0;
        giftsData.forEach(gift => {
          total += (gift.amount_usd || 0);
        });
        setTotalCollected(total);
      }
      
      // 3. Fetch available hosts
      try {
        const res = await fetch('/api/hosts');
        if (res.ok) {
          const data = await res.json();
          setHosts(data.hosts || []);
          if (data.hosts && data.hosts.length > 0) {
            setSelectedHost(data.hosts[0].email);
          }
        }
      } catch (err) {
        console.error("Failed to fetch hosts:", err);
      }

      setIsInitializing(false);
    };
    fetchEventAndTotals();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usd && !khr) {
      alert("Please enter at least one amount (USD or KHR).");
      return;
    }
    
    if (!eventId) {
      alert("Error: Event not found. Cannot submit gift.");
      return;
    }
    
    if (!selectedHost) {
      alert("Please select a host.");
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
          status: "pending",
          event_id: eventId,
          event_slug: Array.isArray(slug) ? slug[0] : slug,
          host_email: selectedHost
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
            type: "submitted",
            event_id: eventId
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

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center text-rose-500">
           <svg className="animate-spin h-8 w-8 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
           <p className="font-medium">កំពុងដំណើរការ (Loading)...</p>
        </div>
      </div>
    );
  }

  if (eventNotFound) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-rose-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-rose-800 font-heading">Event Not Found</CardTitle>
            <CardDescription>We couldn't find a wedding event for "{slug}".</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
            {hosts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="host">អ្នកអញ្ជើញ (Which host invited you?)</Label>
                <select 
                  id="host"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={selectedHost}
                  onChange={(e) => setSelectedHost(e.target.value)}
                  required
                >
                  {hosts.map(h => (
                    <option key={h.email} value={h.email}>{h.name || formatHostName(h.email)}</option>
                  ))}
                </select>
              </div>
            )}
            
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
                type="datetime-local"
                step="1"
                value={transferDate}
                readOnly
                className="bg-gray-100"
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
