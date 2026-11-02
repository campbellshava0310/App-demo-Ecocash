package com.example.shop;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Talks to the EcoCash Online Payments sandbox.
 * Docs: https://developers.ecocash.co.zw/docs/online-payments
 *
 * YOUR MISSION: make the three methods below talk to EcoCash.
 * Every method should return EcoCash's JSON response as a Map. OrderController
 * already reads clientCorrelator, referenceCode, transactionOperationStatus and
 * ecocashReference out of it, so once these work the whole shop works.
 *
 * Hint: Spring's RestClient can send HTTP requests and turn JSON into a Map.
 */
@Service
public class EcoCashClient {

    private final String baseUrl;
    private final String username;
    private final String password;
    private final String merchantCode;
    private final String merchantPin;
    private final String merchantNumber;

    // These values come from src/main/resources/application.properties
    public EcoCashClient(@Value("${ecocash.base-url}") String baseUrl,
                         @Value("${ecocash.username}") String username,
                         @Value("${ecocash.password}") String password,
                         @Value("${ecocash.merchant-code}") String merchantCode,
                         @Value("${ecocash.merchant-pin}") String merchantPin,
                         @Value("${ecocash.merchant-number}") String merchantNumber) {
        this.baseUrl = baseUrl;
        this.username = username;
        this.password = password;
        this.merchantCode = merchantCode;
        this.merchantPin = merchantPin;
        this.merchantNumber = merchantNumber;

        // TODO: every EcoCash request needs Basic authentication:
        //   Authorization: Basic base64(username:password)
    }

    /**
     * 1. Prompt payment: EcoCash sends a PIN prompt to the customer's phone.
     *
     * POST {baseUrl}/transactions/amount/
     *
     * phone       - the customer's number, already cleaned up to look like 263777222481
     * amount      - the cart total in USD
     * description - what they are buying, e.g. "1 x Football"
     *
     * EcoCash answers "PENDING SUBSCRIBER VALIDATION" straight away. The customer then types
     * a PIN on their phone (sandbox: 0000 = success, 1111 = insufficient funds, 2222 = wrong PIN).
     */
    public Map<String, Object> requestPayment(String phone, BigDecimal amount, String description) {
        // TODO: build the JSON body from the docs (tranType "MER") and POST it.
        // Remember: clientCorrelator and referenceCode must be NEW for every request!
        throw new UnsupportedOperationException(
                "Payments are not connected yet. Open EcoCashClient.java and finish requestPayment().");
    }

    /**
     * 2. Check payment status.
     *
     * GET {baseUrl}/{phone}/transactions/amount/{clientCorrelator}
     *
     * When the customer has paid, transactionOperationStatus is COMPLETED
     * and ecocashReference is filled in.
     */
    public Map<String, Object> checkPaymentStatus(String phone, String clientCorrelator) {
        // TODO: send the GET request and return the response
        throw new UnsupportedOperationException(
                "Status checks are not connected yet. Open EcoCashClient.java and finish checkPaymentStatus().");
    }

    /**
     * 3. Refund a completed payment.
     *
     * POST {baseUrl}/transactions/refund/
     *
     * A refund is a brand new transaction: it needs its own clientCorrelator and referenceCode,
     * tranType "REF", and originalEcocashReference set to the ecocashReference of the payment.
     */
    public Map<String, Object> refundPayment(String phone, BigDecimal amount, String originalEcocashReference) {
        // TODO: build the refund body and POST it
        throw new UnsupportedOperationException(
                "Refunds are not connected yet. Open EcoCashClient.java and finish refundPayment().");
    }
}
