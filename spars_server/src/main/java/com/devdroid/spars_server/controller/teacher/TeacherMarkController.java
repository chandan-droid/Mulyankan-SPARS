package com.devdroid.spars_server.controller.teacher;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.BulkMarkCreateRequest;
import com.devdroid.spars_server.dto.MarkCreateRequest;
import com.devdroid.spars_server.dto.MarkDTO;
import com.devdroid.spars_server.dto.MarkUpdateRequest;
import com.devdroid.spars_server.service.teacher.TeacherMarkService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher/marks")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherMarkController {

    private final TeacherMarkService markService;

    @PostMapping("/assessment/{assessmentId}")
    public ResponseEntity<ApiResponse<MarkDTO>> createMarkForAssessment(
            @PathVariable Long assessmentId,
            @Valid @RequestBody MarkCreateRequest request) {
        MarkDTO mark = markService.createMarkForAssessment(assessmentId, request);
        return ResponseEntity.ok(ApiResponse.<MarkDTO>builder()
                .success(true)
                .message("Mark created successfully")
                .data(mark)
                .build());
    }

    @PostMapping("/assessment/{assessmentId}/bulk")
    public ResponseEntity<ApiResponse<List<MarkDTO>>> createMarksForAssessmentBulk(
            @PathVariable Long assessmentId,
            @Valid @RequestBody BulkMarkCreateRequest request) {
        List<MarkDTO> marks = markService.createMarksForAssessmentBulk(assessmentId, request);
        return ResponseEntity.ok(ApiResponse.<List<MarkDTO>>builder()
                .success(true)
                .message("Marks created successfully. Total: " + marks.size())
                .data(marks)
                .build());
    }

    @PutMapping("/{markId}")
    public ResponseEntity<ApiResponse<MarkDTO>> updateMark(
            @PathVariable Long markId,
            @Valid @RequestBody MarkUpdateRequest request) {
        MarkDTO mark = markService.updateMark(markId, request);
        return ResponseEntity.ok(ApiResponse.<MarkDTO>builder()
                .success(true)
                .message("Mark updated successfully")
                .data(mark)
                .build());
    }

    @GetMapping("/assessment/{assessmentId}")
    public ResponseEntity<ApiResponse<List<MarkDTO>>> getMarksByAssessment(@PathVariable Long assessmentId) {
        List<MarkDTO> marks = markService.getMarksByAssessment(assessmentId);
        return ResponseEntity.ok(ApiResponse.<List<MarkDTO>>builder()
                .success(true)
                .message("Marks fetched for assessment")
                .data(marks)
                .build());
    }

    @GetMapping("/student/{studentId}/assessment/{assessmentId}")
    public ResponseEntity<ApiResponse<MarkDTO>> getMarkByStudentAndAssessment(
            @PathVariable Long studentId,
            @PathVariable Long assessmentId) {
        MarkDTO mark = markService.getMarkByStudentAndAssessment(studentId, assessmentId);
        return ResponseEntity.ok(ApiResponse.<MarkDTO>builder()
                .success(true)
                .message("Mark fetched successfully")
                .data(mark)
                .build());
    }

    @GetMapping("/student/{studentId}/class/{classId}")
    public ResponseEntity<ApiResponse<List<MarkDTO>>> getStudentMarksInClass(
            @PathVariable Long studentId,
            @PathVariable Long classId) {
        List<MarkDTO> marks = markService.getStudentMarksInClass(studentId, classId);
        return ResponseEntity.ok(ApiResponse.<List<MarkDTO>>builder()
                .success(true)
                .message("Student marks fetched for class")
                .data(marks)
                .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MarkDTO>>> getAllMarks(
            @RequestParam(required = false) Long assessmentId,
            @RequestParam(required = false) Long classId,
            @RequestParam(required = false) Long studentId) {
        List<MarkDTO> marks;
        String message;

        if (assessmentId != null && classId != null) {
            marks = markService.getMarksByAssessmentAndClass(assessmentId, classId);
            message = "Marks fetched by assessment and class";
        } else if (classId != null) {
            marks = markService.getMarksByClass(classId);
            message = "Marks fetched by class";
        } else if (assessmentId != null) {
            marks = markService.getMarksByAssessment(assessmentId);
            message = "Marks fetched by assessment";
        } else if (studentId != null) {
            marks = markService.getMarksByStudent(studentId);
            message = "Marks fetched by student";
        } else {
            throw new IllegalArgumentException("At least one filter parameter (assessmentId, classId, or studentId) is required");
        }

        return ResponseEntity.ok(ApiResponse.<List<MarkDTO>>builder()
                .success(true)
                .message(message)
                .data(marks)
                .build());
    }
}
