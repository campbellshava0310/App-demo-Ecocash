# Tuck Shop: connect EcoCash 🛒

This is a working online shop (Spring Boot + React). You can browse products and fill
a cart, but **the Pay button doesn't take money yet**. Your job is to connect it to the
EcoCash sandbox so customers can pay, check their payment and get a refund.

The only file you need to change is
`backend/src/main/java/com/example/shop/EcoCashClient.java`.

📖 API docs: https://developers.ecocash.co.zw/docs/online-payments

## 1. Get set up on the developer portal

1. Create an account on https://developers.ecocash.co.zw.
2. Get your sandbox **username and password** (Sandbox → Instant Payments).
3. Under **Test Numbers**, whitelist the phone number you will pay with.
4. Put your username and password in
   `backend/src/main/resources/application.properties`.

## 2. Run the shop

You need Java 17+ and Node 20+.

```bash
# terminal 1: backend on http://localhost:8085
cd backend
./mvnw spring-boot:run
```

```bash
# terminal 2: frontend on http://localhost:5173
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, add something to the cart and click **Pay**. You should see:
_"Payments are not connected yet. Open EcoCashClient.java and finish requestPayment()."_
That's your starting point. After you change Java code, stop the backend (Ctrl+C) and
start it again.

## 3. Your missions

### Mission 1: Prompt a payment

Finish `requestPayment()`. It must `POST` to `/transactions/amount/` with:

- an `Authorization: Basic ...` header made from your username and password
- a JSON body like the one in the docs, with `tranType` set to `MER`, `endUserId` set to
  the customer's phone and the cart total as the `amount`

⚠️ **`clientCorrelator` and `referenceCode` must be different every time.** If you
copy the numbers from the docs, the second payment won't work. Hint:
`System.currentTimeMillis()`.

✅ **It works when** a pop-up says **Check your phone**, the order shows
**Waiting for PIN** and the phone gets a PIN prompt. Enter **0000** to pay.

The shop then checks the payment every 5 seconds. Until Mission 2 is done you'll see
_"Status checks are not connected yet"_. That's your cue to start Mission 2.

### Mission 2: Check the payment status

Finish `checkPaymentStatus()`. It must `GET`
`/{phone}/transactions/amount/{clientCorrelator}`.

✅ **It works when**, a few seconds after you enter the PIN, the pop-up says
**Transaction successful** and the order shows **Paid** with an EcoCash reference
starting with `MP`.

### Mission 3: Refund

Finish `refundPayment()`. It must `POST` to `/transactions/refund/`. A refund is a
**new** transaction, so it needs:

- a new `clientCorrelator` and `referenceCode`
- `tranType` set to `REF`
- `originalEcocashReference` set to the payment's `MP...` reference

✅ **It works when** clicking **Refund** marks the order as **Refunded** and shows a
refund reference starting with `TC`.

### Bonus missions

- On the phone prompt, enter **1111** (insufficient funds) or **2222** (wrong PIN)
  instead of 0000. What status do you get?
- Pay with a number that isn't whitelisted. What does EcoCash say?
- Write a private method so payments and refunds share the code that builds the
  JSON body.

## Tips

- Spring's `RestClient` can send requests and turn the JSON reply into a
  `Map<String, Object>`. Return that map: the rest of the shop reads
  `clientCorrelator`, `referenceCode`, `transactionOperationStatus` and
  `ecocashReference` from it.
- If EcoCash returns an error, the shop shows its message at the top of the page.
  Read it, because it usually tells you exactly what's wrong.
- Don't push your real password to a public GitHub repo.
