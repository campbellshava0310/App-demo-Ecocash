import { useEffect, useState } from 'react'

// Calls our Spring Boot API and turns errors into readable messages
async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Request failed (HTTP ${res.status})`)
  return data
}

// How often to ask EcoCash about payments that are still waiting for a PIN
const CHECK_EVERY_MS = 5000

const TILE_COLOURS = ['#fff4d6', '#e3f1ff', '#ddf7e8', '#f6e6ff', '#ffe5ea', '#e6e9ff']

const money = (value) => `$${Number(value).toFixed(2)}`
const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const isPending = (order) => Boolean(order.status?.startsWith('PENDING'))
const isPaid = (order) => order.status === 'COMPLETED'
const canRefund = (order) => isPaid(order) && !order.refundStatus

// Turns EcoCash's transactionOperationStatus into a friendly label
function statusLabel(order) {
  if (order.refundStatus || order.status === 'TRANSACTION REVERSED') return { text: 'Refunded', tone: 'info' }
  if (isPaid(order)) return { text: 'Paid', tone: 'ok' }
  if (isPending(order)) return { text: 'Waiting for PIN', tone: 'wait' }
  return { text: order.status === 'FAILED' ? 'Failed' : order.status, tone: 'bad' }
}

export default function App() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({}) // productId -> quantity
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState([])
  const [paying, setPaying] = useState(false)
  const [refundingId, setRefundingId] = useState(null)
  const [popupOrderId, setPopupOrderId] = useState(null) // the payment shown in the pop-up
  const [notice, setNotice] = useState(null) // { type: 'ok' | 'error', text }

  useEffect(() => {
    api('/api/products').then(setProducts).catch(showError)
    api('/api/orders').then(setOrders).catch(showError)
  }, [])

  // Every 5 seconds, check each payment that is still waiting for the customer's PIN
  const pendingIds = orders.filter(isPending).map((o) => o.id).join(',')
  useEffect(() => {
    if (!pendingIds) return
    const timer = setInterval(() => {
      for (const id of pendingIds.split(',')) {
        api(`/api/orders/${id}/status`)
          .then((order) => {
            saveOrder(order)
            if (isPaid(order)) {
              setNotice({ type: 'ok', text: `Transaction successful: ${money(order.amount)} paid by ${order.phone}` })
            } else if (!isPending(order)) {
              setNotice({ type: 'error', text: `Transaction failed: EcoCash says ${order.status}` })
            }
          })
          .catch(showError)
      }
    }, CHECK_EVERY_MS)
    return () => clearInterval(timer)
  }, [pendingIds])

  // Success messages disappear on their own; errors stay until closed
  useEffect(() => {
    if (notice?.type !== 'ok') return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  function showError(err) {
    setNotice({ type: 'error', text: err.message })
  }

  // Replace an order in the list, or add it to the top if it is new
  function saveOrder(order) {
    setOrders((list) =>
      list.some((o) => o.id === order.id)
        ? list.map((o) => (o.id === order.id ? order : o))
        : [order, ...list],
    )
  }

  const cartLines = products
    .filter((p) => cart[p.id])
    .map((p) => ({ ...p, quantity: cart[p.id] }))
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const total = cartLines.reduce((sum, line) => sum + line.price * line.quantity, 0)

  function changeQuantity(productId, delta) {
    setCart((current) => {
      const next = { ...current }
      const quantity = (next[productId] || 0) + delta
      if (quantity > 0) next[productId] = quantity
      else delete next[productId]
      return next
    })
  }

  async function pay() {
    setPaying(true)
    setNotice(null)
    try {
      const order = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          items: cartLines.map((line) => ({ productId: line.id, quantity: line.quantity })),
        }),
      })
      saveOrder(order)
      setCart({})
      setPopupOrderId(order.id)
    } catch (err) {
      showError(err)
    } finally {
      setPaying(false)
    }
  }

  async function refund(order) {
    setRefundingId(order.id)
    setNotice(null)
    try {
      const updated = await api(`/api/orders/${order.id}/refund`, { method: 'POST' })
      saveOrder(updated)
      setNotice({ type: 'ok', text: `Refund successful: ${money(updated.amount)} is going back to ${updated.phone}` })
    } catch (err) {
      showError(err)
    } finally {
      setRefundingId(null)
    }
  }

  const popupOrder = orders.find((o) => o.id === popupOrderId)

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">🛒</span>
          Tuck Shop
        </div>
        <div className="topbar-right">
          <span className="sandbox-pill">EcoCash sandbox</span>
          <span className="cart-count" aria-label={`${itemCount} items in cart`}>
            🛍️ <b>{itemCount}</b>
          </span>
        </div>
      </header>

      <section className="hero">
        <h1>
          Everything for school,
          <br />
          <span>paid in seconds.</span>
        </h1>
        <p>Pick your items, enter your EcoCash number and confirm with your PIN.</p>
      </section>

      <main className="layout">
        <section>
          <h2 className="section-title">Products</h2>
          <div className="grid">
            {products.map((p, i) => (
              <article className="product" key={p.id}>
                <div className="product-tile" style={{ background: TILE_COLOURS[i % TILE_COLOURS.length] }}>
                  <span>{p.emoji}</span>
                  {cart[p.id] && <em className="in-cart">{cart[p.id]} in cart</em>}
                </div>
                <div className="product-body">
                  <h3>{p.name}</h3>
                  <div className="product-foot">
                    <span className="price">{money(p.price)}</span>
                    <button className="add" onClick={() => changeQuantity(p.id, 1)} aria-label={`Add ${p.name}`}>
                      +
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="checkout">
          <h2 className="section-title">Your cart</h2>
          {cartLines.length === 0 ? (
            <div className="empty">
              <span>🛍️</span>
              <p>Your cart is empty. Tap + on a product to add it.</p>
            </div>
          ) : (
            <ul className="lines">
              {cartLines.map((line) => (
                <li key={line.id}>
                  <span className="line-name">
                    {line.emoji} {line.name}
                  </span>
                  <span className="stepper">
                    <button onClick={() => changeQuantity(line.id, -1)} aria-label="Remove one">
                      −
                    </button>
                    <b>{line.quantity}</b>
                    <button onClick={() => changeQuantity(line.id, 1)} aria-label="Add one">
                      +
                    </button>
                  </span>
                  <span className="line-total">{money(line.price * line.quantity)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>

          <label className="field">
            <span>EcoCash number</span>
            <div className="phone-input">
              <span>📱</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0777 222 481"
                inputMode="tel"
              />
            </div>
          </label>

          <div className="pin-help">
            <p>Sandbox PINs to type on the phone:</p>
            <ul>
              <li>
                <code>0000</code> pays
              </li>
              <li>
                <code>1111</code> no funds
              </li>
              <li>
                <code>2222</code> wrong PIN
              </li>
              <li>
                <code>9999</code> over limit
              </li>
            </ul>
          </div>

          <button className="pay" disabled={cartLines.length === 0 || !phone.trim() || paying} onClick={pay}>
            {paying ? 'Sending to EcoCash…' : `🔒 Pay ${money(total)} with EcoCash`}
          </button>
        </aside>
      </main>

      <section className="orders">
        <div className="orders-head">
          <h2 className="section-title">Orders</h2>
          {pendingIds && (
            <span className="live">
              <i /> Checking every 5 seconds
            </span>
          )}
        </div>
        {orders.length === 0 ? (
          <p className="muted">No orders yet. Your payments will show up here.</p>
        ) : (
          <ul className="order-list">
            {orders.map((o) => {
              const status = statusLabel(o)
              return (
                <li className="order" key={o.id}>
                  <div className="order-main">
                    <p className="order-items">{o.description}</p>
                    <p className="muted">
                      {o.phone} · {time(o.createdAt)}
                    </p>
                    <div className="refs">
                      <span>
                        clientCorrelator <code>{o.id}</code>
                      </span>
                      <span>
                        referenceCode <code>{o.referenceCode}</code>
                      </span>
                      {o.ecocashReference && (
                        <span>
                          EcoCash ref <code>{o.ecocashReference}</code>
                        </span>
                      )}
                      {o.refundReference && (
                        <span>
                          Refund ref <code>{o.refundReference}</code>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="order-side">
                    <strong>{money(o.amount)}</strong>
                    <span className={`pill ${status.tone}`} title={`EcoCash status: ${o.status}`}>
                      {status.text}
                    </span>
                    {canRefund(o) && (
                      <button className="refund" disabled={refundingId === o.id} onClick={() => refund(o)}>
                        {refundingId === o.id ? 'Refunding…' : '↩ Refund'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {popupOrder && <PaymentPopup order={popupOrder} onClose={() => setPopupOrderId(null)} />}

      {notice && (
        <div className={`toast ${notice.type}`} role="status">
          <span>{notice.type === 'ok' ? '✅' : '⚠️'}</span>
          <p>{notice.text}</p>
          <button onClick={() => setNotice(null)} aria-label="Close message">
            ×
          </button>
        </div>
      )}
    </div>
  )
}

// The pop-up that follows one payment from "check your phone" to the result
function PaymentPopup({ order, onClose }) {
  const pending = isPending(order)
  const paid = isPaid(order)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()} role="dialog" aria-live="polite">
        {pending && (
          <>
            <div className="spinner" />
            <h2>Check your phone</h2>
            <p>
              Enter your EcoCash PIN on <b>{order.phone}</b> to pay <b>{money(order.amount)}</b>.
            </p>
            <p className="muted">We check the payment every 5 seconds.</p>
          </>
        )}
        {paid && (
          <>
            <div className="result ok">✓</div>
            <h2>Transaction successful</h2>
            <p>
              <b>{money(order.amount)}</b> paid by {order.phone}
            </p>
            <p className="muted">
              EcoCash ref <code>{order.ecocashReference}</code>
            </p>
          </>
        )}
        {!pending && !paid && (
          <>
            <div className="result bad">✕</div>
            <h2>Transaction failed</h2>
            <p>
              EcoCash says <b>{order.status}</b>. No money was taken.
            </p>
          </>
        )}
        <button className={pending ? 'secondary' : 'pay'} onClick={onClose}>
          {pending ? 'Hide' : 'Done'}
        </button>
      </div>
    </div>
  )
}
