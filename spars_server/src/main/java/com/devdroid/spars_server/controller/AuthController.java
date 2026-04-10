package com.devdroid.spars_server.controller;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.AuthResponse;
import com.devdroid.spars_server.dto.ChangePasswordRequest;
import com.devdroid.spars_server.dto.LoginRequest;
import com.devdroid.spars_server.dto.SignupRequest;
import com.devdroid.spars_server.security.CustomUserDetails;
import com.devdroid.spars_server.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody @NonNull LoginRequest loginRequest) {
        return ResponseEntity.ok(ApiResponse.<AuthResponse>builder()
                .success(true)
                .message("Login successful")
                .data(authService.login(loginRequest))
                .build());
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@AuthenticationPrincipal CustomUserDetails currentUser,
                                                            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(currentUser.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Password changed successfully")
                .build());
    }

//    @PostMapping("/signup/admin")
//    public ResponseEntity<ApiResponse<AuthResponse>> signupAdmin(@Valid @RequestBody SignupRequest request) {
//        return ResponseEntity.ok(ApiResponse.<AuthResponse>builder()
//                .success(true)
//                .message("Admin signup successful")
//                .data(authService.signupAdmin(request))
//                .build());
//    }
//
//    @PostMapping("/signup/teacher")
//    public ResponseEntity<ApiResponse<AuthResponse>> signupTeacher(@Valid @RequestBody SignupRequest request) {
//        return ResponseEntity.ok(ApiResponse.<AuthResponse>builder()
//                .success(true)
//                .message("Teacher signup successful")
//                .data(authService.signupTeacher(request))
//                .build());
//    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CustomUserDetails>> getCurrentUser(@AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.<CustomUserDetails>builder()
                .success(true)
                .message("Current user details fetched successfully")
                .data(currentUser)
                .build());
    }
}

