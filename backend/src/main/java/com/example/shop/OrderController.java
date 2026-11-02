package com.example.shop;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    public record CartItem(int productId, int quantity) {}

    public record CheckoutRequest(String phone, List<CartItem> items) {}

    private final EcoCashClient ecocash;

    // Orders live in memory, so they disappear when the server restarts
    private final Map<String, Order> orders = new ConcurrentHashMap<>();

    public OrderController(EcoCashClient ecocash) {
        this.ecocash = ecocash;
    }

    @GetMapping
    public List<Order> list() {
        List<Order> all = new ArrayList<>(orders.values());
        all.sort(Comparator.comparing((Order o) -> o.createdAt).reversed());
        return all;
    }

    @PostMapping
    public Order checkout(@RequestBody CheckoutRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Your cart is empty");
        }
        String phone = normalisePhone(request.phone());

        // Work the total out on the server: never trust prices sent by the browser
        BigDecimal total = BigDecimal.ZERO;
        List<String> lines = new ArrayList<>();
        for (CartItem item : request.items()) {
            Product product = ProductController.findById(item.productId())
                    .orElseThrow(() -> new IllegalArgumentException("Unknown product " + item.productId()));
            total = total.add(product.price().multiply(BigDecimal.valueOf(item.quantity())));
            lines.add(item.quantity() + " x " + product.name());
        }
        String description = String.join(", ", lines);

        Map<String, Object> response = ecocash.requestPayment(phone, total, description);

        Order order = new Order();
        order.id = text(response, "clientCorrelator");
        order.referenceCode = text(response, "referenceCode");
        order.phone = phone;
        order.description = description;
        order.amount = total;
        order.status = text(response, "transactionOperationStatus");
        order.ecocashReference = text(response, "ecocashReference");
        orders.put(order.id, order);
        return order;
    }

    @GetMapping("/{id}/status")
    public Order checkStatus(@PathVariable String id) {
        Order order = find(id);
        Map<String, Object> response = ecocash.checkPaymentStatus(order.phone, order.id);

        order.status = text(response, "transactionOperationStatus");
        // After a refund EcoCash reports the refund's reference here, so keep the original one
        if (order.ecocashReference == null) {
            order.ecocashReference = text(response, "ecocashReference");
        }
        return order;
    }

    @PostMapping("/{id}/refund")
    public Order refund(@PathVariable String id) {
        Order order = find(id);
        if (!"COMPLETED".equals(order.status) || order.ecocashReference == null) {
            throw new IllegalArgumentException("Only completed payments can be refunded. Check the status first.");
        }
        if (order.refundStatus != null) {
            throw new IllegalArgumentException("This order has already been refunded");
        }
        Map<String, Object> response = ecocash.refundPayment(order.phone, order.amount, order.ecocashReference);

        order.refundStatus = text(response, "transactionOperationStatus");
        order.refundReference = text(response, "ecocashReference");
        return order;
    }

    private Order find(String id) {
        Order order = orders.get(id);
        if (order == null) {
            throw new IllegalArgumentException("No order with id " + id);
        }
        return order;
    }

    // Accepts 0777222481, 777222481, 263777222481 or +263 77 722 2481 and returns 263777222481
    static String normalisePhone(String input) {
        String digits = input == null ? "" : input.replaceAll("\\D", "");
        if (digits.startsWith("0")) {
            digits = "263" + digits.substring(1);
        } else if (digits.length() == 9) {
            digits = "263" + digits;
        }
        if (!digits.matches("2637\\d{8}")) {
            throw new IllegalArgumentException("Enter an EcoCash number like 0777222481");
        }
        return digits;
    }

    private static String text(Map<String, Object> json, String key) {
        Object value = json == null ? null : json.get(key);
        return value == null ? null : value.toString();
    }
}
