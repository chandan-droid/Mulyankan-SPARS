package com.devdroid.spars_server.service;

import com.devdroid.spars_server.dto.AuthResponse;
import com.devdroid.spars_server.dto.ChangePasswordRequest;
import com.devdroid.spars_server.dto.LoginRequest;
import com.devdroid.spars_server.dto.SignupRequest;
import com.devdroid.spars_server.entity.Role;
import com.devdroid.spars_server.entity.Teacher;
import com.devdroid.spars_server.entity.User;
import com.devdroid.spars_server.repository.TeacherRepository;
import com.devdroid.spars_server.repository.UserRepository;
import com.devdroid.spars_server.security.CustomUserDetails;
import com.devdroid.spars_server.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return buildAuthResponse(user);
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public AuthResponse signupAdmin(SignupRequest request) {
        return signupWithRole(request, Role.ADMIN);
    }

    public AuthResponse signupTeacher(SignupRequest request) {
        if (request.getDepartment() == null || request.getDepartment().isBlank()) {
            throw new IllegalArgumentException("Department is required for teacher signup");
        }
        return signupWithRole(request, Role.TEACHER);
    }

    private AuthResponse signupWithRole(SignupRequest request, Role role) {
        userRepository.findByEmail(request.getEmail())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Email already registered");
                });

        User user = User.builder()
                .email(request.getEmail())
                .name(request.getName())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        User savedUser = userRepository.save(user);

        if (role == Role.TEACHER) {
            Teacher teacher = Teacher.builder()
                    .user(savedUser)
                    .department(request.getDepartment().trim())
                    .build();
            teacherRepository.save(teacher);
        }

        return buildAuthResponse(savedUser);
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtService.generateToken(new CustomUserDetails(user));

        AuthResponse.AuthResponseBuilder responseBuilder = AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .role(user.getRole().name());

        if (user.getRole() == Role.TEACHER) {
            teacherRepository.findByUserId(user.getId())
                    .map(Teacher::getDepartment)
                    .ifPresent(responseBuilder::department);
        }

        return responseBuilder.build();
    }
}
