import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  console.log("--> API /api/notify called!");
  try {
    const { guest_name, amount_usd, amount_khr, old_amount_usd, old_amount_khr, totalUsd, totalKhr, type } = await request.json();
    console.log(`--> Received request to notify for gift: ${guest_name}, type: ${type || 'approved'}`);

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

    let message = "";
    if (type === "submitted") {
      message = `🛎 <b>New Gift Submitted (Pending Approval)</b>\n\n` +
                `<b>Guest:</b> ${guest_name}\n` +
                `<b>Amount:</b> $${amount_usd ?? 0} / ៛${amount_khr ?? 0}`;
    } else if (type === "edited") {
      message = `✏️ <b>Gift Amount Edited</b>\n\n` +
                `<b>Guest:</b> ${guest_name}\n` +
                `<b>Old Amount:</b> $${old_amount_usd ?? 0} / ៛${old_amount_khr ?? 0}\n` +
                `<b>New Amount:</b> $${amount_usd ?? 0} / ៛${amount_khr ?? 0}\n\n` +
                `<b>Total Collected:</b> $${totalUsd ?? 0} / ៛${totalKhr ?? 0}`;
    } else {
      message = `🎉 <b>New Gift Approved!</b>\n\n` +
                `<b>Guest:</b> ${guest_name}\n` +
                `<b>Amount:</b> $${amount_usd ?? 0} / ៛${amount_khr ?? 0}\n\n` +
                `<b>Total Collected:</b> $${totalUsd ?? 0} / ៛${totalKhr ?? 0}`;
    }

    // Send to all Telegram chat IDs (comma separated)
    const chatIds = chatId.split(',').map(id => id.trim()).filter(id => id);
    
    const sendPromises = chatIds.map(id => 
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: id,
          text: message,
          parse_mode: 'HTML',
        }),
      })
    );

    const telegramResponses = await Promise.all(sendPromises);
    
    // Check if any of the requests failed
    const failedResponses = telegramResponses.filter(res => !res.ok);
    if (failedResponses.length > 0) {
        for (const failedRes of failedResponses) {
          const errorData = await failedRes.text();
          console.error("Telegram API Error:", errorData);
        }
        return NextResponse.json({ error: 'Failed to send Telegram message to one or more chats' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notify API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
