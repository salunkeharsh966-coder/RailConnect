
package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {

        try {
            User registeredUser = userService.registerUser(user);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(registeredUser);

        } catch (IllegalArgumentException ex) {
            return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());

        } catch (Exception ex) {
            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Registration failed. Please try again."
            );
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {

        if (loginRequest == null
                || loginRequest.getEmail() == null
                || loginRequest.getEmail().isBlank()
                || loginRequest.getPassword() == null
                || loginRequest.getPassword().isBlank()) {

            return errorResponse(
                    HttpStatus.BAD_REQUEST,
                    "Email and password are required"
            );
        }

        Optional<User> userOptional =
                userService.getUserByEmail(loginRequest.getEmail());

        if (userOptional.isEmpty()) {
            return errorResponse(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        User user = userOptional.get();

        // Compatible with the existing plaintext-password database.
        // Replace this with password hashing before production use.
        if (!user.getPassword().equals(loginRequest.getPassword())) {
            return errorResponse(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        return ResponseEntity.ok(user);
    }

    private ResponseEntity<Map<String, String>> errorResponse(
            HttpStatus status,
            String message
    ) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("message", message);

        return ResponseEntity.status(status).body(body);
    }
}
