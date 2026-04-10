package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.CoAttainmentReportDTO;
import com.devdroid.spars_server.service.CoAttainmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/co-attainment")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCoAttainmentController {

    private final CoAttainmentService coAttainmentService;

    @GetMapping("/institute/subject/{subjectId}")
    public ResponseEntity<ApiResponse<CoAttainmentReportDTO>> getInstituteCoAttainment(@PathVariable Long subjectId) {
        CoAttainmentReportDTO report = coAttainmentService.getInstituteCoAttainment(subjectId);
        return ResponseEntity.ok(ApiResponse.<CoAttainmentReportDTO>builder()
                .success(true)
                .message("Institute CO attainment fetched successfully")
                .data(report)
                .build());
    }

    @GetMapping("/class/{classId}/subject/{subjectId}")
    public ResponseEntity<ApiResponse<CoAttainmentReportDTO>> getClassCoAttainment(
            @PathVariable Long classId, @PathVariable Long subjectId) {
        CoAttainmentReportDTO report = coAttainmentService.getClassCoAttainment(classId, subjectId);
        return ResponseEntity.ok(ApiResponse.<CoAttainmentReportDTO>builder()
                .success(true)
                .message("Class CO attainment fetched successfully")
                .data(report)
                .build());
    }

    @GetMapping("/student/{studentId}/subject/{subjectId}")
    public ResponseEntity<ApiResponse<CoAttainmentReportDTO>> getStudentCoAttainment(
            @PathVariable Long studentId, @PathVariable Long subjectId) {
        CoAttainmentReportDTO report = coAttainmentService.getStudentCoAttainment(studentId, subjectId);
        return ResponseEntity.ok(ApiResponse.<CoAttainmentReportDTO>builder()
                .success(true)
                .message("Student CO attainment fetched successfully")
                .data(report)
                .build());
    }
}
