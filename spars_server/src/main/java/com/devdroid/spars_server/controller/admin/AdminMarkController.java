package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.MarkDTO;
import com.devdroid.spars_server.service.admin.AdminMarkService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/marks")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminMarkController {

    private final AdminMarkService markService;

    @GetMapping("/{markId}")
    public ResponseEntity<ApiResponse<MarkDTO>> getMarkById(@PathVariable Long markId) {
        MarkDTO mark = markService.getMarkById(markId);
        return ResponseEntity.ok(ApiResponse.<MarkDTO>builder()
                .success(true)
                .message("Mark fetched successfully")
                .data(mark)
                .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MarkDTO>>> getMarks(
            @RequestParam(required = false) Long assessmentId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long classId
    ) {
        List<MarkDTO> marks;
        String message;

        if (assessmentId != null && classId != null) {
            marks = markService.getMarksByAssessmentAndClass(assessmentId, classId);
            message = "Marks fetched by assessment and class";
        } else if (assessmentId != null) {
            marks = markService.getMarksByAssessment(assessmentId);
            message = "Marks fetched by assessment";
        } else if (studentId != null && classId != null) {
            marks = markService.getMarksByStudentAndClass(studentId, classId);
            message = "Marks fetched by student and class";
        } else if (studentId != null) {
            marks = markService.getMarksByStudent(studentId);
            message = "Marks fetched by student";
        } else if (classId != null) {
            marks = markService.getMarksByClass(classId);
            message = "Marks fetched by class";
        } else {
            throw new IllegalArgumentException("At least one filter parameter (assessmentId, studentId, or classId) is required");
        }

        return ResponseEntity.ok(ApiResponse.<List<MarkDTO>>builder()
                .success(true)
                .message(message)
                .data(marks)
                .build());
    }
}
