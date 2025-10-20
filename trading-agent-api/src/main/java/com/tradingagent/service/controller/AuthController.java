package com.tradingagent.service.controller;

import com.tradingagent.service.common.Result;
import com.tradingagent.service.dto.AuthResponse;
import com.tradingagent.service.dto.LoginRequest;
import com.tradingagent.service.dto.RegisterRequest;
import com.tradingagent.service.entity.User;
import com.tradingagent.service.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Result<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(Result.success(response, "Registration successful"));
    }

    @PostMapping("/login")
    public ResponseEntity<Result<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(Result.success(response, "Login successful"));
    }

    @GetMapping("/me")
    public ResponseEntity<Result<Map<String, Object>>> getCurrentUser() {
        User user = authService.getCurrentUser();
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("email", user.getEmail());
        return ResponseEntity.ok(Result.success(userData));
    }

    @PostMapping("/logout")
    public ResponseEntity<Result<Void>> logout() {
        // Since we're using JWT tokens, logout is handled on the client side
        // by removing the token. This endpoint is provided for consistency
        // and can be extended to implement token blacklisting if needed.
        return ResponseEntity.ok(Result.success(null, "Logout successful"));
    }
}
