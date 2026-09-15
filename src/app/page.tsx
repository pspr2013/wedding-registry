import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 font-khmer">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center space-y-8">
        <h1 className="text-3xl font-bold text-slate-800 font-khmer-title">
          ប្រព័ន្ធកត់ចំណងដៃអាពាហ៍ពិពាហ៍
          <span className="block text-xl text-slate-500 mt-2 font-sans">Wedding Registry</span>
        </h1>

        <div className="space-y-4 flex flex-col">
          <Link href="/event/test-wedding" className={buttonVariants({ variant: "default", className: "w-full text-lg h-12" })}>
            View Guest Form (ភ្ញៀវ)
          </Link>
          
          <Link href="/host" className={buttonVariants({ variant: "outline", className: "w-full text-lg h-12" })}>
            Host Dashboard (ម្ចាស់ដើមការ)
          </Link>
          
          <Link href="/admin" className={buttonVariants({ variant: "secondary", className: "w-full text-lg h-12" })}>
            Admin Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
