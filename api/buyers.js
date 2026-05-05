import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PAYMENT_LINK_ID = process.env.PAYMENT_LINK_ID || 'plink_1THQec1bSWmFalXMIsNk6AOI';

export default async function handler(req, res) {
  const auth = req.headers['x-admin-password'] || req.query.password;
  if (auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const buyers = [];
    let starting_after;
    for (let i = 0; i < 10; i++) {
      const params = { payment_link: PAYMENT_LINK_ID, limit: 100 };
      if (starting_after) params.starting_after = starting_after;
      const page = await stripe.checkout.sessions.list(params);
      for (const s of page.data) {
        if (s.status === 'complete' && s.payment_status === 'paid') {
          const cd = s.customer_details || {};
          const lineItems = await stripe.checkout.sessions.listLineItems(s.id, { limit: 10 });
          const qty = lineItems.data.reduce((sum, li) => sum + (li.quantity || 0), 0);
          buyers.push({
            id: s.id,
            name: cd.name || '',
            email: cd.email || '',
            phone: cd.phone || '',
            quantity: qty,
            amount: (s.amount_total || 0) / 100,
            currency: (s.currency || '').toUpperCase(),
            created: s.created,
            createdISO: new Date(s.created * 1000).toISOString(),
          });
        }
      }
      if (!page.has_more) break;
      starting_after = page.data[page.data.length - 1]?.id;
    }
    buyers.sort((a, b) => b.created - a.created);
    const totalTickets = buyers.reduce((sum, b) => sum + b.quantity, 0);
    const totalRevenue = buyers.reduce((sum, b) => sum + b.amount, 0);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ buyers, totalTickets, totalRevenue, count: buyers.length });
  } catch (err) {
    console.error('buyers.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}
