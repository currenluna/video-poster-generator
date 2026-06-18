import { useState } from 'react';
import { RESOLUTIONS } from '../utils/constants';

export default function CartView({ state, settings, onBackToCreate }) {
  const [paperType, setPaperType] = useState('matte');
  const [quantity, setQuantity] = useState(1);
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [isOrdered, setIsOrdered] = useState(false);

  const N = settings.extractedFrames.length;
  const hasItem = N > 0;

  // Determine price based on print size
  const res = RESOLUTIONS[settings.aspectRatio];
  const sizeLabel = res ? res.label.split(' (')[0] : '27" x 36"';
  const isSquare = settings.aspectRatio === '24x24';
  const unitPrice = isSquare ? 35.00 : 45.00;
  const totalPrice = unitPrice * quantity;

  const handleOrderSubmit = (e) => {
    e.preventDefault();
    if (!shippingName || !shippingAddress) {
      alert('PLEASE FILL OUT SHIPPING DETAILS.');
      return;
    }
    setIsOrdered(true);
    state.setStatusText('PRINT ORDER SUBMITTED SUCCESSFULLY!');
    state.setStatusType('active');
  };

  if (isOrdered) {
    return (
      <div className="cart-empty-state">
        <div className="success-icon">✓</div>
        <h2>ORDER RECEIVED!</h2>
        <p>Thank you for your order. We are preparing your high-res 300 PPI print study.</p>
        <p className="order-sub">A confirmation email was sent to your inbox.</p>
        <button 
          type="button" 
          className="action-btn return-btn"
          onClick={() => {
            setIsOrdered(false);
            onBackToCreate();
          }}
        >
          CREATE ANOTHER PRINT
        </button>
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
        <button 
          type="button" 
          className="action-btn return-btn"
          onClick={onBackToCreate}
          style={{ width: 'auto', margin: 0, padding: '8px 16px', fontSize: '11px' }}
        >
          ← RETURN TO BUILDER
        </button>
      </div>

      <div className="cart-layout">
        {/* Cart Item Details */}
        <div className="cart-item-section">
          <div className="cart-item-card">
            <div className="cart-item-preview">
              {/* Show miniature grid display or canvas thumbnail */}
              <div className="mock-grid-thumbnail">
                <span className="grid-meta-tag">{settings.aspectRatio}</span>
              </div>
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

        {/* Checkout Billing & Shipping Form */}
        <form className="cart-checkout-form" onSubmit={handleOrderSubmit}>
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
            <label htmlFor="payment-card">CARD DETAILS:</label>
            <input 
              type="text" 
              id="payment-card"
              required 
              placeholder="••••  ••••  ••••  ••••"
              maxLength="19"
            />
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

          <button type="submit" className="action-btn checkout-btn">
            PLACE PRINT ORDER
          </button>
        </form>
      </div>
    </div>
  );
}
