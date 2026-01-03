const admin = require('./_firebase');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuration des packs de crédits (doit correspondre à PricingConfig.kt)
const CREDIT_PACKS = {
    'pack_1000': { credits: 1000, price: 12.50 },
    'pack_5000': { credits: 5500, price: 62.50 },  // +10% bonus
    'pack_10000': { credits: 12000, price: 125.00 } // +20% bonus
};

module.exports = async (req, res) => {
    // Vérifier que c'est bien une requête POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Vérifier la signature du webhook
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('⚠️ Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Gérer l'événement
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;

            try {
                // Récupérer les métadonnées
                const userId = session.metadata?.userId;
                const packId = session.metadata?.packId;

                if (!userId || !packId) {
                    console.error('❌ Missing userId or packId in session metadata');
                    return res.status(400).json({ error: 'Missing metadata' });
                }

                // Vérifier que le pack existe
                const pack = CREDIT_PACKS[packId];
                if (!pack) {
                    console.error(`❌ Unknown pack ID: ${packId}`);
                    return res.status(400).json({ error: 'Unknown pack' });
                }

                // Vérifier le montant payé (en centimes)
                const expectedAmount = Math.round(pack.price * 100);
                if (session.amount_total !== expectedAmount) {
                    console.error(`❌ Amount mismatch: expected ${expectedAmount}, got ${session.amount_total}`);
                    return res.status(400).json({ error: 'Amount mismatch' });
                }

                // Créditer l'utilisateur
                const userRef = admin.firestore().collection('users').doc(userId);

                await admin.firestore().runTransaction(async (transaction) => {
                    const userDoc = await transaction.get(userRef);

                    if (!userDoc.exists) {
                        throw new Error('User not found');
                    }

                    const currentCredits = userDoc.data().credits || 0;
                    const newCredits = currentCredits + pack.credits;

                    // Mettre à jour les crédits
                    transaction.update(userRef, {
                        credits: newCredits,
                        lastPurchaseDate: admin.firestore.FieldValue.serverTimestamp(),
                        totalSpent: admin.firestore.FieldValue.increment(pack.price)
                    });

                    // Enregistrer la transaction
                    const purchaseRef = admin.firestore().collection('purchases').doc();
                    transaction.set(purchaseRef, {
                        userId: userId,
                        packId: packId,
                        credits: pack.credits,
                        priceEuros: pack.price,
                        stripeSessionId: session.id,
                        stripePaymentIntentId: session.payment_intent,
                        status: 'completed',
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                });

                console.log(`✅ User ${userId} credited with ${pack.credits} credits (${packId})`);

                return res.status(200).json({
                    success: true,
                    userId: userId,
                    creditsAdded: pack.credits
                });

            } catch (error) {
                console.error('❌ Error processing payment:', error);
                return res.status(500).json({ error: error.message });
            }

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log(`❌ Payment failed: ${failedPayment.id}`);

            // TODO: Notifier l'utilisateur par email ou notification push

            return res.status(200).json({ received: true });

        default:
            console.log(`Unhandled event type: ${event.type}`);
            return res.status(200).json({ received: true });
    }
};
