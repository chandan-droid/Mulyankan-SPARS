package com.devdroid.spars_server.controller.teacher;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.AssessmentDTO;
import com.devdroid.spars_server.service.teacher.TeacherAssessmentService;
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
@RequestMapping("/api/teacher/grades")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherAssessmentController {

    private final TeacherAssessmentService gradeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AssessmentDTO>>> getMyAssessments(
            @RequestParam(required = false) Long classId,
            @RequestParam(required = false) Long subjectId
    ) {
        List<AssessmentDTO> assessments = gradeService.getMyAssessments(classId, subjectId);
        return ResponseEntity.ok(ApiResponse.<List<AssessmentDTO>>builder()
                .success(true)
                .message("Assessments fetched successfully")
                .data(assessments)
                .build());
    }

    @GetMapping("/{assessmentId}")
    public ResponseEntity<ApiResponse<AssessmentDTO>> getAssessmentDetails(@PathVariable Long assessmentId) {
        AssessmentDTO assessment = gradeService.getAssessmentById(assessmentId);
        return ResponseEntity.ok(ApiResponse.<AssessmentDTO>builder()
                .success(true)
                .message("Assessment details fetched successfully")
                .data(assessment)
                .build());
    }
}
