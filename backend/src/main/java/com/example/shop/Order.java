package com.example.shop;

import java.math.BigDecimal;
import java.time.Instant;

public class Order {

    public String id;               // the clientCorrelator we sent to EcoCash
    public String referenceCode;
    public String phone;
    public String description;
    public BigDecimal amount;
    public String status;           // EcoCash transactionOperationStatus, e.g. COMPLETED
    public String ecocashReference; // e.g. MP261102.1301.T8933923, needed for refunds
    public String refundStatus;
    public String refundReference;
    public Instant createdAt = Instant.now();
}
