package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.AcademicClassDTO;
import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.service.admin.AcademicClassService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/classes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AcademicClassController {

    private final AcademicClassService academicClassService;

    @PostMapping
    public ResponseEntity<ApiResponse<AcademicClassDTO>> createClass(@Valid @RequestBody AcademicClassDTO request) {
        AcademicClassDTO createdClass = academicClassService.createClass(request);
        return ResponseEntity.ok(ApiResponse.<AcademicClassDTO>builder()
                .success(true)
                .message("Class created successfully")
                .data(createdClass)
                .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AcademicClassDTO>>> getAllClasses() {
        List<AcademicClassDTO> classes = academicClassService.getAllClasses();
        return ResponseEntity.ok(ApiResponse.<List<AcademicClassDTO>>builder()
                .success(true)
                .message("Classes fetched successfully")
                .data(classes)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AcademicClassDTO>> getClassById(@PathVariable Long id) {
        AcademicClassDTO academicClass = academicClassService.getClassById(id);
        return ResponseEntity.ok(ApiResponse.<AcademicClassDTO>builder()
                .success(true)
                .message("Class fetched successfully")
                .data(academicClass)
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AcademicClassDTO>> updateClass(@PathVariable Long id, @Valid @RequestBody AcademicClassDTO request) {
        AcademicClassDTO updatedClass = academicClassService.updateClass(id, request);
        return ResponseEntity.ok(ApiResponse.<AcademicClassDTO>builder()
                .success(true)
                .message("Class updated successfully")
                .data(updatedClass)
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteClass(@PathVariable Long id) {
        academicClassService.deleteClass(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Class deleted successfully")
                .build());
    }
}
