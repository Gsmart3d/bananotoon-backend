const admin = require('./_firebase');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuration des packs (synchronisé avec PricingConfig.kt)
const STRIPE_PRICE_IDS = {
    'pack_1000': process.env.STRIPE_PRICE_ID_1000,   // À configurer dans Vercel
    'pack_5000': process.env.STRIPE_PRICE_ID_5000,   // À configurer dans Vercel
    'pack_10000': process.env.STRIPE_PRICE_ID_10000  // À configurer dans Vercel
};

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, packId } = req.body;

        // Validation
        if (!userId || !packId) {
            return res.status(400).json({
                success: false,
                error: 'Missing userId or packId'
            });
        }

        // Vérifier que le pack existe
        const priceId = STRIPE_PRICE_IDS[packId];
        if (!priceId) {
            return res.status(400).json({
                success: false,
                error: `Unknown pack: ${packId}`
            });
        }

        // Vérifier que l'utilisateur existe
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userData = userDoc.data();

        // Créer la session de paiement Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin || 'https://bananoai.app'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'https://bananoai.app'}/payment-cancel`,
            client_reference_id: userId,
            customer_email: userData.email || undefined,
            metadata: {
                userId: userId,
                packId: packId
            }
        });

        console.log(`✅ Checkout session created for user ${userId}, pack ${packId}`);

        return res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('❌ Error creating checkout session:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
