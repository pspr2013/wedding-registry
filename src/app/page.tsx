import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 font-khmer">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center space-y-8">
        <h1 className="text-3xl font-bold text-slate-800 font-khmer-title">
          ប្រព័ន្ធកត់ចំណងដៃអាពាហ៍ពិពាហ៍
          <span className="block text-xl text-slate-500 mt-2 font-sans">Wedding Registry</span>
        </h1>

        <div className="space-y-4">
          <Button asChild className="w-full text-lg h-12" variant="default">
            <Link href="/event/test-wedding">View Guest Form (ភ្ញៀវ)</Link>
          </Button>
          
          <Button asChild className="w-full text-lg h-12" variant="outline">
            <Link href="/host">Host Dashboard (ម្ចាស់ដើមការ)</Link>
          </Button>
          
          <Button asChild className="w-full text-lg h-12" variant="secondary">
            <Link href="/admin">Admin Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
