package com.example.shop;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    // A tiny hard-coded catalogue keeps the demo focused on payments
    private static final List<Product> PRODUCTS = List.of(
            new Product(1, "Exercise Book", "📓", new BigDecimal("1.00")),
            new Product(2, "Pencil Set", "✏️", new BigDecimal("0.50")),
            new Product(3, "Water Bottle", "🥤", new BigDecimal("2.00")),
            new Product(4, "Earphones", "🎧", new BigDecimal("3.50")),
            new Product(5, "Football", "⚽", new BigDecimal("5.00")),
            new Product(6, "School Bag", "🎒", new BigDecimal("8.00")));

    @GetMapping
    public List<Product> all() {
        return PRODUCTS;
    }

    public static Optional<Product> findById(int id) {
        return PRODUCTS.stream().filter(p -> p.id() == id).findFirst();
    }
}
