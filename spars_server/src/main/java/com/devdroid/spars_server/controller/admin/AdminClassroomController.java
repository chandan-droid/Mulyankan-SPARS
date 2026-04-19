package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.AcademicClassDTO;
import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.service.admin.AdminClassService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/classrooms")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminClassroomController {

    private final AdminClassService adminClassService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AcademicClassDTO>>> getAllClasses() {
        List<AcademicClassDTO> classDetails = adminClassService.getAllClasses();
        return ResponseEntity.ok(ApiResponse.<List<AcademicClassDTO>>builder()
                .success(true)
                .message("All class details fetched successfully")
                .data(classDetails)
                .build());
    }

    @GetMapping("/{classId}")
    public ResponseEntity<ApiResponse<AcademicClassDTO>> getClassById(@PathVariable Long classId) {
        AcademicClassDTO classDetails = adminClassService.getClassById(classId);
        return ResponseEntity.ok(ApiResponse.<AcademicClassDTO>builder()
                .success(true)
                .message("Class details fetched successfully")
                .data(classDetails)
                .build());
    }
}
