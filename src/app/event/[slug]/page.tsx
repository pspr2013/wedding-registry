"use client";

import { useState } from "react";
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
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let slip_url = "";
      
      // 1. Upload Slip if provided
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
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
          slip_url,
          status: "pending"
        });

      if (insertError) throw insertError;

      alert(`ជូនពរអ្នកទទួលបានជោគជ័យ! ចំណងដៃត្រូវបានកត់ត្រាទុកដោយជោគជ័យ។ (Gift successfully recorded)`);
      
      // Reset form
      setName("");
      setUsd("");
      setKhr("");
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
