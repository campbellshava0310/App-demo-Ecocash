package com.example.shop;

import java.math.BigDecimal;

public record Product(int id, String name, String emoji, BigDecimal price) {
}
