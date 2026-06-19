import { useEffect, useRef, useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '../utils/stripe';
import { RESOLUTIONS } from '../utils/constants';
import { drawPoster } from '../utils/posterRenderer';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontFamily: "'Google Sans Flex', Arial, Helvetica, sans-serif",
      fontSize: '14px',
      color: '#141414',
      letterSpacing: '-0.01em',
      '::placeholder': { color: '#b3b3b3' },
    },
    invalid: { color: '#d9383a' },
  },
};

/**
 * CheckoutForm — Shipping fields + a real Stripe Elements card field (test
 * mode). createPaymentMethod() is a genuine client-safe call to Stripe's API
 * (no secret key needed), so card validation/tokenization is real. There's
 * no backend here to actually capture the charge, so once we have a real
 * PaymentMethod, the rest of the order pipeline continues as a simulation
 * (same as the existing render/upload/printer steps).
 */
function CheckoutForm({ shippingName, setShippingName, shippingAddress, setShippingAddress, totalPrice, disabled, onPaymentMethodReady }) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState(null);
  const [cardFocused, setCardFocused] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shippingName || !shippingAddress) {
      alert('PLEASE FILL OUT SHIPPING DETAILS.');
      return;
    }
    if (!stripe || !elements) return;

    setCardError(null);
    setIsValidating(true);

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
      billing_details: { name: shippingName },
    });

    setIsValidating(false);

    if (error) {
      setCardError(error.message);
      return;
    }

    onPaymentMethodReady(paymentMethod);
  };

  return (
    <form className="cart-checkout-form" onSubmit={handleSubmit}>
      <h3>SHIPPING DETAILS</h3>

      <div className="form-group">
        <label htmlFor="shipping-name">FULL NAME:</label>
        <input
          type="text"
          id="shipping-name"
          required
          placeholder="e.g. John Doe"
          value={shippingName}
          onChange={(e) => setShippingName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="shipping-address">SHIPPING ADDRESS:</label>
        <input
          type="text"
          id="shipping-address"
          required
          placeholder="123 Gallery Way, New York, NY 10001"
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="card-element">CARD DETAILS (STRIPE TEST MODE):</label>
        <div className={`stripe-card-element-wrapper${cardFocused ? ' focused' : ''}`}>
          <CardElement
            id="card-element"
            options={CARD_ELEMENT_OPTIONS}
            onFocus={() => setCardFocused(true)}
            onBlur={() => setCardFocused(false)}
            onChange={() => setCardError(null)}
          />
        </div>
        {cardError ? (
          <p className="stripe-card-error">{cardError}</p>
        ) : (
          <p className="stripe-test-hint">Test mode — use card 4242 4242 4242 4242, any future expiry, any CVC.</p>
        )}
      </div>

      <div className="order-summary-box">
        <div className="summary-row">
          <span>Subtotal:</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Shipping:</span>
          <span>FREE</span>
        </div>
        <hr className="summary-divider" />
        <div className="summary-row total-row">
          <span>Total:</span>
          <strong>${totalPrice.toFixed(2)}</strong>
        </div>
      </div>

      <button type="submit" className="action-btn checkout-btn" disabled={disabled || isValidating}>
        {isValidating ? 'VALIDATING CARD…' : 'PLACE PRINT ORDER'}
      </button>
    </form>
  );
}

export default function CartView({ state, settings, onBackToCreate }) {
  const paperType = state.paperType;
  const setPaperType = state.setPaperType;
  const [quantity, setQuantity] = useState(1);
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [isOrdered, setIsOrdered] = useState(false);

  // API simulator states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0); // 0 = idle, 1 = render, 2 = upload, 3 = stripe, 4 = webhook, 5 = creativehub, 6 = success
  const [s3Url, setS3Url] = useState('');
  const [creativehubFileId, setCreativehubFileId] = useState('');
  const [stripePaymentMethod, setStripePaymentMethod] = useState(null);
  const [printspacePayload, setPrintspacePayload] = useState(null);
  const [openSection, setOpenSection] = useState(null); // 'stripe' | 'printspace' | null

  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && settings) {
      drawPoster(canvasRef.current, settings);
    }
  }, [settings]);

  const N = settings.extractedFrames.length;
  const hasItem = N > 0;

  // Determine price based on print size
  const res = RESOLUTIONS[settings.aspectRatio];
  const sizeLabel = res ? res.label.split(' (')[0] : '27" x 36"';
  const isSquare = settings.aspectRatio === '24x24';
  const unitPrice = isSquare ? 35.00 : 45.00;
  const totalPrice = unitPrice * quantity;

  // Called once Stripe has actually tokenized the card (real test-mode API
  // call). From here on, the order pipeline is simulated — there's no
  // backend in this app to capture a real charge.
  const handlePaymentMethodReady = (paymentMethod) => {
    setStripePaymentMethod(paymentMethod);

    setIsSimulating(true);
    setSimStep(1);
    state.setStatusText('API FULFILLMENT: COMPILING 300 PPI FILE...');
    state.setStatusType('warning');

    // Step 1: LOCAL RENDER (300 PPI)
    setTimeout(() => {
      setSimStep(2);
      const mockFileUrl = `https://storage.afterimage.com/prints/order_${Date.now()}_highres.jpg`;
      setS3Url(mockFileUrl);
      state.setStatusText('API FULFILLMENT: UPLOADING TO S3 BUCKET...');
      state.setStatusType('warning');

      // Step 2: CLOUD UPLOAD (S3)
      setTimeout(() => {
        setSimStep(3);
        state.setStatusText('API FULFILLMENT: CONFIRMING PAYMENT VIA STRIPE...');
        state.setStatusType('warning');

        // Step 3: STRIPE PAYMENT CONFIRMATION (paymentMethod is real test-mode data)
        setTimeout(() => {
          setSimStep(4);
          state.setStatusText('API FULFILLMENT: TRIGGERING WEBHOOK...');
          state.setStatusType('warning');

          // Step 4: WEBHOOK FIRED & PARSED BY MIDDLEWARE
          setTimeout(() => {
            setSimStep(5);
            const mockFileId = `file_${Math.random().toString(36).substring(2, 9)}`;
            setCreativehubFileId(mockFileId);
            state.setStatusText('API FULFILLMENT: PUSHING TO THEPRINTSPACE...');
            state.setStatusType('warning');

            // Generate Creativehub Order Payload — same printer as before
            const orderRequest = {
              externalReference: `Stripe-${paymentMethod.id}`,
              recipientAddress: {
                firstName: shippingName.split(' ')[0] || '',
                lastName: shippingName.split(' ').slice(1).join(' ') || '',
                line1: shippingAddress,
                line2: "",
                city: "New York",
                state: "NY",
                postalCode: "10001",
                countryCode: "US"
              },
              items: [
                {
                  fileId: mockFileId,
                  quantity: quantity,
                  paperType: paperType === 'matte' ? 'hahnemuhle-photo-rag' : (paperType === 'glossy' ? 'satin-semi-gloss' : 'luster-pearl'),
                  widthInches: settings.aspectRatio === '24x24' ? 24 : (settings.aspectRatio === '27x36' ? 27 : 36),
                  heightInches: settings.aspectRatio === '24x24' ? 24 : (settings.aspectRatio === '27x36' ? 36 : 27)
                }
              ]
            };
            setPrintspacePayload(orderRequest);

            // Step 5: THEPRINTSPACE FULFILLMENT REGISTERED
            setTimeout(() => {
              setSimStep(6);
              setIsSimulating(false);
              setIsOrdered(true);
              state.setStatusText('PRINT ORDER FULFILLED SUCCESSFULLY VIA API!');
              state.setStatusType('active');
            }, 1000);

          }, 1000);

        }, 1000);

      }, 1000);

    }, 1000);
  };

  if (isSimulating || isOrdered) {
    return (
      <div className="cart-empty-state fulfillment-success-view">
        <div className="success-icon">{isSimulating ? '⚙' : '✓'}</div>
        <h2>{isSimulating ? 'PROCESSING API FULFILLMENT...' : 'ORDER RECEIVED & FULFILLED!'}</h2>
        <p style={{ maxWidth: '580px', margin: '12px auto' }}>
          {isSimulating
            ? 'Running local rendering, confirming payment with Stripe, and syncing with the dropship printer API...'
            : 'Fulfillment successfully processed. We have rendered the 300 PPI print study, confirmed payment via Stripe, and generated the order on theprintspace.'}
        </p>

        {/* Fulfillment Log Console */}
        <div className="fulfillment-console">
          <div className="console-header">
            <span className="console-dot red"></span>
            <span className="console-dot yellow"></span>
            <span className="console-dot green"></span>
            <span className="console-title">Fulfillment Webhook Engine Log</span>
          </div>
          <div className="console-body">
            {/* Step 1: Render */}
            <div className={`console-row${simStep >= 1 ? ' active' : ''}${simStep > 1 ? ' done' : ''}`}>
              <span className="step-bullet"></span>
              <span className="step-text">
                [1/5] RENDER: Compiling high-res 300 PPI file... {simStep > 1 ? 'DONE' : (simStep === 1 ? 'PROCESSING' : 'PENDING')}
              </span>
            </div>

            {/* Step 2: Upload */}
            <div className={`console-row${simStep >= 2 ? ' active' : ''}${simStep > 2 ? ' done' : ''}`}>
              <span className="step-bullet"></span>
              <span className="step-text">
                [2/5] UPLOAD: Storing JPEG to S3 bucket... {simStep > 2 ? 'DONE' : (simStep === 2 ? 'UPLOADING' : 'PENDING')}
              </span>
              {s3Url && <div className="console-sub-log">File URL: <a href={s3Url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>{s3Url}</a></div>}
            </div>

            {/* Step 3: Stripe */}
            <div className={`console-row${simStep >= 3 ? ' active' : ''}${simStep > 3 ? ' done' : ''}`}>
              <span className="step-bullet"></span>
              <span className="step-text">
                [3/5] STRIPE: Confirming PaymentMethod {stripePaymentMethod?.id}... {simStep > 3 ? 'DONE' : (simStep === 3 ? 'CONFIRMING' : 'PENDING')}
              </span>
              {stripePaymentMethod && (
                <div className="console-sub-log">
                  {stripePaymentMethod.card.brand.toUpperCase()} •••• {stripePaymentMethod.card.last4} (test mode)
                </div>
              )}
            </div>

            {/* Step 4: Webhook */}
            <div className={`console-row${simStep >= 4 ? ' active' : ''}${simStep > 4 ? ' done' : ''}`}>
              <span className="step-bullet"></span>
              <span className="step-text">
                [4/5] WEBHOOK: Firing `payment_intent.succeeded` middleware webhook... {simStep > 4 ? 'DONE' : (simStep === 4 ? 'TRIGGERING' : 'PENDING')}
              </span>
            </div>

            {/* Step 5: Creativehub */}
            <div className={`console-row${simStep >= 5 ? ' active' : ''}${simStep > 5 ? ' done' : ''}`}>
              <span className="step-bullet"></span>
              <span className="step-text">
                [5/5] THEPRINTSPACE: Submitting print order via Creativehub API... {simStep > 5 ? 'FULFILLED' : (simStep === 5 ? 'SUBMITTING' : 'PENDING')}
              </span>
              {creativehubFileId && <div className="console-sub-log">Creativehub File ID registered: {creativehubFileId}</div>}
            </div>
          </div>
        </div>

        {/* API Payloads Accordions */}
        {simStep >= 3 && (
          <div className="payloads-section">
            <h4 className="payloads-title">INSPECT API INTEGRATION PAYLOADS</h4>

            {/* Stripe PaymentMethod Accordion — this is the real object Stripe returned */}
            <div className="payload-accordion">
              <button
                type="button"
                className={`accordion-trigger${openSection === 'stripe' ? ' active' : ''}`}
                onClick={() => setOpenSection(openSection === 'stripe' ? null : 'stripe')}
              >
                {openSection === 'stripe' ? '▼' : '▶'} View Stripe PaymentMethod (real test-mode response)
              </button>
              {openSection === 'stripe' && stripePaymentMethod && (
                <pre className="payload-json">
                  <code>{JSON.stringify(stripePaymentMethod, null, 2)}</code>
                </pre>
              )}
            </div>

            {/* Creativehub Payload Accordion */}
            <div className="payload-accordion" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className={`accordion-trigger${openSection === 'printspace' ? ' active' : ''}`}
                onClick={() => setOpenSection(openSection === 'printspace' ? null : 'printspace')}
              >
                {openSection === 'printspace' ? '▼' : '▶'} View theprintspace (Creativehub API) payload
              </button>
              {openSection === 'printspace' && printspacePayload && (
                <pre className="payload-json">
                  <code>{JSON.stringify(printspacePayload, null, 2)}</code>
                </pre>
              )}
            </div>
          </div>
        )}

        {!isSimulating && (
          <button
            type="button"
            className="action-btn return-btn"
            onClick={() => {
              setIsOrdered(false);
              setSimStep(0);
              setS3Url('');
              setCreativehubFileId('');
              setStripePaymentMethod(null);
              setPrintspacePayload(null);
              setOpenSection(null);
              onBackToCreate();
            }}
            style={{ marginTop: '32px' }}
          >
            CREATE ANOTHER PRINT
          </button>
        )}
      </div>
    );
  }

  if (!hasItem) {
    return (
      <div className="cart-empty-state">
        <h2>NO PRINT DESIGNED YET</h2>
        <p>You haven't generated a poster study yet. Upload a video to get started.</p>
        <button
          type="button"
          className="action-btn return-btn"
          onClick={onBackToCreate}
        >
          ← BACK TO BUILDER
        </button>
      </div>
    );
  }

  return (
    <div className="cart-view-container">
      <div className="cart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>CHECKOUT</h2>
          <p>ORDER ARCHIVAL QUALITY FINE-ART PRINTS</p>
        </div>
      </div>

      <div className="cart-layout">
        {/* Cart Item Details */}
        <div className="cart-item-section">
          <div className="cart-item-card">
            <div className="cart-item-preview">
              <canvas ref={canvasRef} className="cart-item-canvas" />
            </div>

            <div className="cart-item-info">
              <h3>{settings.videoName || 'UNTITLED STUDY'}</h3>
              <p className="cart-item-meta">
                VIDEO: {settings.videoWidth}x{settings.videoHeight} • {N} STILLS
              </p>
              <p className="cart-item-size">
                SIZE: {sizeLabel}
              </p>

              {/* Paper Selection */}
              <div className="cart-option-row">
                <label htmlFor="paper-type">PAPER FINISH:</label>
                <select
                  id="paper-type"
                  value={paperType}
                  onChange={(e) => setPaperType(e.target.value)}
                >
                  <option value="matte">Fine Art Matte (200gsm) — Neutral & Classic</option>
                  <option value="glossy">Satin Semi-Gloss (240gsm) — High Contrast & Deep Darks</option>
                  <option value="luster">Archival Luster (260gsm) — Pearl finish</option>
                </select>
              </div>

              {/* Quantity selector */}
              <div className="cart-option-row">
                <label>QUANTITY:</label>
                <div className="stepper-input qty-stepper">
                  <button
                    type="button"
                    className="btn-step"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className="qty-val">{quantity}</span>
                  <button
                    type="button"
                    className="btn-step"
                    onClick={() => setQuantity(q => q + 1)}
                  >
                    ＋
                  </button>
                </div>
              </div>

              <div className="cart-item-price">
                <span>PRICE:</span>
                <strong>${totalPrice.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Billing & Shipping Form — real Stripe Elements card field (test mode) */}
        <Elements stripe={stripePromise}>
          <CheckoutForm
            shippingName={shippingName}
            setShippingName={setShippingName}
            shippingAddress={shippingAddress}
            setShippingAddress={setShippingAddress}
            totalPrice={totalPrice}
            disabled={isSimulating}
            onPaymentMethodReady={handlePaymentMethodReady}
          />
        </Elements>
      </div>
    </div>
  );
}
