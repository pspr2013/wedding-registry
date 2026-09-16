import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  console.log("--> API /api/notify called!");
  try {
    const { id } = await request.json();
    console.log("--> Received request to notify for gift ID:", id);

    if (!id) {
      console.log("--> Missing gift ID, returning 400");
      return NextResponse.json({ error: 'Missing gift ID' }, { status: 400 });
    }

    // Fetch the approved gift details
    const { data: gift, error: giftError } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', id)
      .single();

    if (giftError || !gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    // Calculate total collected
    const { data: allApproved, error: allApprovedError } = await supabase
      .from('gifts')
      .select('amount_usd')
      .eq('status', 'approved');

    let totalUsd = 0;
    if (!allApprovedError && allApproved) {
        totalUsd = allApproved.reduce((acc, curr) => acc + (Number(curr.amount_usd) || 0), 0);
    }

    // Construct the Telegram message
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn("Telegram credentials not configured.");
      return NextResponse.json({ error: 'Telegram credentials not configured' }, { status: 500 });
    }

    const message = `🎉 *New Gift Approved!*\n\n` +
                    `*Guest:* ${gift.guest_name}\n` +
                    `*Amount:* $${gift.amount_usd} / ៛${gift.amount_khr}\n\n` +
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
