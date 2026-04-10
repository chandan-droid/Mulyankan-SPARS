package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.AssessmentDTO;
import com.devdroid.spars_server.service.admin.AssessmentService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/assessments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAssessmentController {

    private final AssessmentService assessmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AssessmentDTO>>> getAssessments() {
        List<AssessmentDTO> assessments = assessmentService.getAllAssessments();
        return ResponseEntity.ok(ApiResponse.<List<AssessmentDTO>>builder()
                .success(true)
                .message("All assessments fetched successfully")
                .data(assessments)
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AssessmentDTO>> updateAssessment(@PathVariable Long id, @Valid @RequestBody AssessmentDTO request) {
        AssessmentDTO updatedAssessment = assessmentService.updateAssessment(id, request);
        return ResponseEntity.ok(ApiResponse.<AssessmentDTO>builder()
                .success(true)
                .message("Assessment updated successfully")
                .data(updatedAssessment)
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAssessment(@PathVariable Long id) {
        assessmentService.deleteAssessment(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Assessment deleted successfully")
                .build());
    }
}
