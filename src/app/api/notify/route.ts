import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  console.log("--> API /api/notify called!");
  try {
    const { guest_name, amount_usd, amount_khr, totalUsd } = await request.json();
    console.log("--> Received request to notify for gift:", guest_name);

    if (!guest_name) {
      console.log("--> Missing gift details, returning 400");
      return NextResponse.json({ error: 'Missing gift details' }, { status: 400 });
    }

    // Construct the Telegram message
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn("Telegram credentials not configured.");
      return NextResponse.json({ error: 'Telegram credentials not configured' }, { status: 500 });
    }

    const message = `🎉 *New Gift Approved!*\n\n` +
                    `*Guest:* ${guest_name}\n` +
                    `*Amount:* $${amount_usd} / ៛${amount_khr}\n\n` +
                    `*Total Collected:* $${totalUsd}`;

    // Send to Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!telegramResponse.ok) {
        const errorData = await telegramResponse.text();
        console.error("Telegram API Error:", errorData);
        return NextResponse.json({ error: 'Failed to send Telegram message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notify API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
