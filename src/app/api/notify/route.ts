import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  console.log("--> API /api/notify called!");
  try {
    const { guest_name, amount_usd, amount_khr, old_amount_usd, old_amount_khr, totalUsd, totalKhr, type, transfer_date, event_id } = await request.json();
    console.log(`--> Received request to notify for gift: ${guest_name}, type: ${type || 'approved'}`);

    if (!guest_name) {
      console.log("--> Missing gift details, returning 400");
      return NextResponse.json({ error: 'Missing gift details' }, { status: 400 });
    }

    // Construct the Telegram message
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;

    if (event_id) {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('telegram_chat_id, telegram_bot_token')
        .eq('id', event_id)
        .single();
        
      if (!eventError && eventData) {
        if (eventData.telegram_chat_id) chatId = eventData.telegram_chat_id;
        if (eventData.telegram_bot_token) botToken = eventData.telegram_bot_token;
      } else {
        console.warn("Could not fetch event telegram details:", eventError);
      }
    }

    if (!botToken || !chatId) {
      console.warn("Telegram credentials not configured.");
      return NextResponse.json({ error: 'Telegram credentials not configured' }, { status: 500 });
    }

    let message = "";
    const dateStr = transfer_date ? `\n📅 <b>Transfer Date:</b> ${transfer_date}` : '';

    if (type === "submitted") {
      message = `🎉 <b>New Gift Submitted!</b> 🎉\n\n👤 <b>From:</b> ${guest_name}\n💵 <b>USD:</b> $${(amount_usd ?? 0).toLocaleString()}\n៛ <b>KHR:</b> ${(amount_khr ?? 0).toLocaleString()}៛${dateStr}\n\n⏳ <i>Status: Pending Approval</i>`;
    } else if (type === "approved") {
      message = `✅ <b>Gift Approved!</b> ✅\n\n👤 <b>From:</b> ${guest_name}\n💵 <b>USD:</b> $${(amount_usd ?? 0).toLocaleString()}\n៛ <b>KHR:</b> ${(amount_khr ?? 0).toLocaleString()}៛\n\n💖 <i>Thank you for your blessing!</i>`;
    } else if (type === "edited") {
      message = `✏️ <b>Gift Amount Edited</b>\n\n` +
                `<b>Guest:</b> ${guest_name}\n` +
                `<b>Old Amount:</b> $${(old_amount_usd ?? 0).toLocaleString()} / ៛${(old_amount_khr ?? 0).toLocaleString()}\n` +
                `<b>New Amount:</b> $${(amount_usd ?? 0).toLocaleString()} / ៛${(amount_khr ?? 0).toLocaleString()}\n\n` +
                `<b>Total Collected:</b> $${(totalUsd ?? 0).toLocaleString()} / ៛${(totalKhr ?? 0).toLocaleString()}`;
    } else {
      message = `🎉 <b>New Gift Approved!</b>\n\n` +
                `<b>Guest:</b> ${guest_name}\n` +
                `<b>Amount:</b> $${(amount_usd ?? 0).toLocaleString()} / ៛${(amount_khr ?? 0).toLocaleString()}\n\n` +
                `<b>Total Collected:</b> $${(totalUsd ?? 0).toLocaleString()} / ៛${(totalKhr ?? 0).toLocaleString()}`;
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
