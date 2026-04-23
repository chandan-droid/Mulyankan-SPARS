package com.devdroid.spars_server.controller.teacher;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.analytics.CoAttainmentComparisonDTO;
import com.devdroid.spars_server.dto.analytics.AssignmentsByBranchDTO;
import com.devdroid.spars_server.dto.analytics.MarksEntryProgressSummaryDTO;
import com.devdroid.spars_server.dto.analytics.OverallPerformanceDTO;
import com.devdroid.spars_server.dto.analytics.PerformanceDistributionDTO;
import com.devdroid.spars_server.dto.analytics.ReportFileDTO;
import com.devdroid.spars_server.dto.analytics.StudentPerformanceDTO;
import com.devdroid.spars_server.dto.analytics.StudentRiskBandDTO;
import com.devdroid.spars_server.dto.analytics.TrendPointDTO;
import com.devdroid.spars_server.security.CustomUserDetails;
import com.devdroid.spars_server.service.AnalyticsService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherAnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/assessment/{assessmentId}/performance-distribution")
    public ResponseEntity<ApiResponse<List<PerformanceDistributionDTO>>> getPerformanceDistribution(
            @PathVariable Long assessmentId) {
        List<PerformanceDistributionDTO> distribution = analyticsService.getPerformanceDistribution(assessmentId);
        return ResponseEntity.ok(ApiResponse.<List<PerformanceDistributionDTO>>builder()
                .success(true)
                .message("Performance distribution fetched successfully")
                .data(distribution)
                .build());
    }

    @GetMapping("/subject/{subjectId}/top-performers")
    public ResponseEntity<ApiResponse<List<StudentPerformanceDTO>>> getTopPerformers(
            @PathVariable Long subjectId,
            @RequestParam(defaultValue = "5") int count) {
        List<StudentPerformanceDTO> performers = analyticsService.getTopPerformers(subjectId, count);
        return ResponseEntity.ok(ApiResponse.<List<StudentPerformanceDTO>>builder()
                .success(true)
                .message("Top performers fetched successfully")
                .data(performers)
                .build());
    }

    @GetMapping("/subject/{subjectId}/bottom-performers")
    public ResponseEntity<ApiResponse<List<StudentPerformanceDTO>>> getBottomPerformers(
            @PathVariable Long subjectId,
            @RequestParam(defaultValue = "5") int count) {
        List<StudentPerformanceDTO> performers = analyticsService.getBottomPerformers(subjectId, count);
        return ResponseEntity.ok(ApiResponse.<List<StudentPerformanceDTO>>builder()
                .success(true)
                .message("Bottom performers fetched successfully")
                .data(performers)
                .build());
    }

    @GetMapping("/subject/{subjectId}/co-attainment-comparison")
    public ResponseEntity<ApiResponse<List<CoAttainmentComparisonDTO>>> getCoAttainmentComparison(
            @PathVariable Long subjectId) {
        List<CoAttainmentComparisonDTO> comparison = analyticsService.getCoAttainmentComparison(subjectId);
        return ResponseEntity.ok(ApiResponse.<List<CoAttainmentComparisonDTO>>builder()
                .success(true)
                .message("CO attainment comparison fetched successfully")
                .data(comparison)
                .build());
    }

    @GetMapping("/class/{classId}/overview")
    public ResponseEntity<ApiResponse<OverallPerformanceDTO>> getClassOverview(
            @PathVariable Long classId,
            @RequestParam(required = false) Long subjectId) {
        return ResponseEntity.ok(ApiResponse.<OverallPerformanceDTO>builder()
                .success(true)
                .message("Class performance overview fetched successfully")
                .data(analyticsService.getClassOverview(classId, subjectId))
                .build());
    }

    @GetMapping("/class/{classId}/top-students")
    public ResponseEntity<ApiResponse<List<StudentRiskBandDTO>>> getTopStudents(
            @PathVariable Long classId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(defaultValue = "5") int count) {
        return ResponseEntity.ok(ApiResponse.<List<StudentRiskBandDTO>>builder()
                .success(true)
                .message("Top class students fetched successfully")
                .data(analyticsService.getTeacherTopStudents(classId, subjectId, count))
                .build());
    }

    @GetMapping("/class/{classId}/weak-students")
    public ResponseEntity<ApiResponse<List<StudentRiskBandDTO>>> getWeakStudents(
            @PathVariable Long classId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(defaultValue = "40") double threshold) {
        return ResponseEntity.ok(ApiResponse.<List<StudentRiskBandDTO>>builder()
                .success(true)
                .message("Weak class students fetched successfully")
                .data(analyticsService.getTeacherWeakStudents(classId, subjectId, threshold))
                .build());
    }

    @GetMapping("/class/{classId}/trends")
    public ResponseEntity<ApiResponse<List<TrendPointDTO>>> getTrends(
            @PathVariable Long classId,
            @RequestParam(required = false) Long subjectId) {
        return ResponseEntity.ok(ApiResponse.<List<TrendPointDTO>>builder()
                .success(true)
                .message("Class performance trends fetched successfully")
                .data(analyticsService.getTeacherPerformanceTrends(classId, subjectId))
                .build());
    }

    //shows marks entry progress across assessments in %
    @GetMapping("/marks-entry-progress")
    public ResponseEntity<ApiResponse<MarksEntryProgressSummaryDTO>> getMarksEntryProgress(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.<MarksEntryProgressSummaryDTO>builder()
                .success(true)
                .message("Marks entry progress fetched successfully")
                .data(analyticsService.getTeacherMarksEntryProgress(currentUser.getUser().getId()))
                .build());
    }

    //count assignment by branch
    @GetMapping("/assignments-by-branch")
    public ResponseEntity<ApiResponse<List<AssignmentsByBranchDTO>>> getAssignmentsByBranch(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.<List<AssignmentsByBranchDTO>>builder()
                .success(true)
                .message("Assignments by branch fetched successfully")
                .data(analyticsService.getTeacherAssignmentsByBranch(currentUser.getUser().getId()))
                .build());
    }

    @GetMapping("/class/{classId}/reports/generate")
    public ResponseEntity<ApiResponse<ReportFileDTO>> generateReport(
            @PathVariable Long classId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam String reportType,
            @RequestParam(defaultValue = "PDF") String format) {
        return ResponseEntity.ok(ApiResponse.<ReportFileDTO>builder()
                .success(true)
                .message("Teacher report generated successfully")
                .data(analyticsService.generateTeacherReport(classId, subjectId, reportType, format))
                .build());
    }
}
