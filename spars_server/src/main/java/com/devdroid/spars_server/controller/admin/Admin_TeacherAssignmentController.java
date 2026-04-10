package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.TeacherAssignmentDTO;
import com.devdroid.spars_server.service.admin.TeacherAssignmentService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/teacher-assignments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class Admin_TeacherAssignmentController {

    private final TeacherAssignmentService teacherAssignmentService;

    @PostMapping
    public ResponseEntity<ApiResponse<TeacherAssignmentDTO>> createAssignment(@Valid @RequestBody TeacherAssignmentDTO request) {
        TeacherAssignmentDTO createdAssignment = teacherAssignmentService.createAssignment(request);
        return ResponseEntity.ok(ApiResponse.<TeacherAssignmentDTO>builder()
                .success(true)
                .message("Teacher assignment created successfully")
                .data(createdAssignment)
                .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TeacherAssignmentDTO>>> getAllAssignments() {
        List<TeacherAssignmentDTO> assignments = teacherAssignmentService.getAllAssignments();
        return ResponseEntity.ok(ApiResponse.<List<TeacherAssignmentDTO>>builder()
                .success(true)
                .message("Teacher assignments fetched successfully")
                .data(assignments)
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAssignment(@PathVariable Long id) {
        teacherAssignmentService.deleteAssignment(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Teacher assignment deleted successfully")
                .build());
    }
}
