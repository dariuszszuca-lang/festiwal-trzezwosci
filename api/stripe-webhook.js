import Stripe from 'stripe';
import { Resend } from 'resend';
import QRCode from 'qrcode';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const BCC = process.env.BCC_EMAIL || 'kontakt@osrodek-myway.pl';
const FROM = 'III Festiwal Trzeźwości <bilety@osrodek-myway.pl>';

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function buildTicketHtml({ name, email, qty, amount, ticketCode }) {
  const qtyLabel = qty === 1 ? '1 bilet' : `${qty} bilety`;
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,serif;color:#1a1a1a">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf8;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#0D4F4F,#1A8F8F);padding:40px 32px;text-align:center;color:#fff">
<div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;opacity:0.9;margin-bottom:8px">III Festiwal Trzeźwości MyWay</div>
<div style="font-size:34px;font-weight:700;line-height:1.1;margin-bottom:8px">8 sierpnia 2026</div>
<div style="font-size:16px;opacity:0.95">sobota, od 10:00 · Kąpino</div>
</td></tr>
<tr><td style="padding:32px 32px 16px 32px">
<p style="font-size:17px;line-height:1.6;margin:0 0 12px 0">Cześć ${name},</p>
<p style="font-size:17px;line-height:1.6;margin:0 0 12px 0">Dziękujemy za zakup biletu. Czekamy na Ciebie 8 sierpnia w Kąpinie.</p>
<p style="font-size:17px;line-height:1.6;margin:0">To jest Twój bilet. Pokaż go przy wejściu, na telefonie albo wydrukowany.</p>
</td></tr>
<tr><td style="padding:0 32px 24px 32px">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5f0;border:2px dashed #C0A472;border-radius:12px">
<tr><td style="padding:28px;text-align:center">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8a6d3b;margin-bottom:16px">Twój bilet wstępu</div>
<div style="font-size:24px;font-weight:700;margin-bottom:8px">${name}</div>
<div style="font-size:18px;color:#444;margin-bottom:20px">${qtyLabel} · ${amount} zł</div>
<img src="cid:qr-ticket" alt="QR ${ticketCode}" width="200" height="200" style="display:inline-block;width:200px;height:200px;background:#fff;padding:12px;border-radius:8px">
<div style="font-family:'Courier New',monospace;font-size:16px;font-weight:700;color:#1a1a1a;margin-top:14px;letter-spacing:2px;background:#fff;padding:8px 14px;border-radius:6px;display:inline-block">${ticketCode}</div>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 32px 24px 32px">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf8;border-left:4px solid #0D4F4F;border-radius:8px">
<tr><td style="padding:20px 24px">
<div style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0D4F4F;margin-bottom:12px">Co warto wiedzieć</div>
<div style="font-size:15px;line-height:1.7">
<strong>Kiedy:</strong> sobota, 8 sierpnia 2026, od 10:00<br>
<strong>Gdzie:</strong> ul. Wichrowe Wzgórza 21, Kąpino (woj. pomorskie)<br>
<strong>Parking:</strong> na miejscu, bezpłatny<br>
<strong>Z Trójmiasta:</strong> ok. 20 minut samochodem<br>
<strong>Na miejscu:</strong> koncert Backstage, dmuchańce, grill, konkursy, wręczenie medali
</div>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 32px 32px 32px;text-align:center">
<a href="https://festiwaltrzezwosci.pl" style="display:inline-block;background:#0D4F4F;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px">Zobacz program festiwalu →</a>
</td></tr>
<tr><td style="background:#1a1a1a;color:#aaa;padding:24px 32px;text-align:center;font-size:13px;line-height:1.6">
Masz pytania? Napisz na <a href="mailto:kontakt@osrodek-myway.pl" style="color:#fff;text-decoration:underline">kontakt@osrodek-myway.pl</a><br>
albo zadzwoń: <strong style="color:#fff">731 395 295</strong><br><br>
<span style="font-size:11px;opacity:0.6">Ośrodek MyWay · Kąpino</span>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildTicketPlain({ name, qty, amount, ticketCode }) {
  const qtyLabel = qty === 1 ? '1 bilet' : `${qty} bilety`;
  return `Cześć ${name},

Dziękujemy za zakup biletu na III Festiwal Trzeźwości MyWay.

KIEDY: sobota, 8 sierpnia 2026, od 10:00
GDZIE: ul. Wichrowe Wzgórza 21, Kąpino
PARKING: na miejscu, bezpłatny

TWÓJ BILET: ${name}
${qtyLabel} · ${amount} zł
Kod: ${ticketCode}

Pokaż ten mail przy wejściu (na telefonie lub wydrukowany).

Pytania? kontakt@osrodek-myway.pl albo 731 395 295.

Do zobaczenia 8 sierpnia w Kąpinie!
`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const raw = await readRaw(req);
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type !== 'checkout.session.completed') {
    return res.json({ received: true, ignored: event.type });
  }

  const session = event.data.object;
  if (session.payment_status !== 'paid') {
    return res.json({ received: true, status: 'unpaid' });
  }

  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });
    const cd = full.customer_details || {};
    const email = cd.email;
    const name = cd.name || 'Gość Festiwalu';
    const amount = (full.amount_total || 0) / 100;
    const lineItems = full.line_items?.data || [];
    const qty = lineItems.reduce((sum, li) => sum + (li.quantity || 0), 0) || 1;

    const shortId = full.id.slice(-10).toUpperCase();
    const ticketCode = `FESTIWAL2026-${shortId}`;
    const qrBuffer = await QRCode.toBuffer(ticketCode, { width: 400, margin: 1, color: { dark: '#0D4F4F', light: '#ffffff' } });

    if (!email) {
      console.error('Missing email for session', full.id);
      return res.json({ received: true, error: 'no_email' });
    }

    const result = await resend.emails.send({
      from: FROM,
      to: [email],
      bcc: [BCC],
      subject: `Twój bilet na III Festiwal Trzeźwości — 8 sierpnia, Kąpino`,
      html: buildTicketHtml({ name, email, qty, amount, ticketCode }),
      text: buildTicketPlain({ name, qty, amount, ticketCode }),
      attachments: [{
        filename: 'bilet-qr.png',
        content: qrBuffer.toString('base64'),
        content_id: 'qr-ticket',
      }],
    });

    console.log('Ticket email sent:', { sessionId: full.id, email, ticketCode, resendId: result.data?.id });
    return res.json({ received: true, sent: true, ticketCode });
  } catch (err) {
    console.error('Ticket send failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
