package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.analytics.*;
import com.devdroid.spars_server.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAnalyticsController {

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

    @GetMapping("/class/{classId}/performance-distribution")
    public ResponseEntity<ApiResponse<List<PerformanceDistributionDTO>>> getPerformanceDistribution(
            @PathVariable Long classId,
            @RequestParam(required = false) Long subjectId) {
        List<PerformanceDistributionDTO> distribution = analyticsService.getPerformanceDistribution(classId, subjectId);
        return ResponseEntity.ok(ApiResponse.<List<PerformanceDistributionDTO>>builder()
                .success(true)
                .message("Performance distribution for class fetched successfully")
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

    @GetMapping("/class/{classId}/top-performers")
    public ResponseEntity<ApiResponse<List<StudentPerformanceDTO>>> getTopPerformers(
            @PathVariable Long classId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(defaultValue = "5") int count) {
        List<StudentPerformanceDTO> performers = analyticsService.getTopPerformers(classId, subjectId, count);
        return ResponseEntity.ok(ApiResponse.<List<StudentPerformanceDTO>>builder()
                .success(true)
                .message("Top performers for class fetched successfully")
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

    @GetMapping("/class/{classId}/bottom-performers")
    public ResponseEntity<ApiResponse<List<StudentPerformanceDTO>>> getBottomPerformers(
            @PathVariable Long classId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(defaultValue = "5") int count) {
        List<StudentPerformanceDTO> performers = analyticsService.getBottomPerformers(classId, subjectId, count);
        return ResponseEntity.ok(ApiResponse.<List<StudentPerformanceDTO>>builder()
                .success(true)
                .message("Bottom performers for class fetched successfully")
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

    @GetMapping("/overall")
    public ResponseEntity<ApiResponse<OverallPerformanceDTO>> getOverallPerformance(
            @RequestParam Long classId,
            @RequestParam(required = false) Long subjectId) {
        return ResponseEntity.ok(ApiResponse.<OverallPerformanceDTO>builder()
                .success(true)
                .message("Overall class performance fetched successfully")
                .data(analyticsService.getOverallPerformance(classId, subjectId))
                .build());
    }

    @GetMapping("/departments/performance")
    public ResponseEntity<ApiResponse<List<DepartmentPerformanceDTO>>> getDepartmentPerformance(
            @RequestParam Long classId,
            @RequestParam(required = false) Long subjectId) {
        return ResponseEntity.ok(ApiResponse.<List<DepartmentPerformanceDTO>>builder()
                .success(true)
                .message("Department-wise performance fetched successfully")
                .data(analyticsService.getDepartmentPerformance(classId, subjectId))
                .build());
    }

    @GetMapping("/subjects/performance")
    public ResponseEntity<ApiResponse<List<SubjectAnalyticsDTO>>> getSubjectAnalytics(
            @RequestParam Long classId) {
        return ResponseEntity.ok(ApiResponse.<List<SubjectAnalyticsDTO>>builder()
                .success(true)
                .message("Subject-wise analytics fetched successfully")
                .data(analyticsService.getSubjectAnalytics(classId))
                .build());
    }

    @GetMapping("/exams/performance")
    public ResponseEntity<ApiResponse<List<ExamAnalyticsDTO>>> getExamAnalytics(
            @RequestParam Long classId,
            @RequestParam(required = false) Long subjectId) {
        return ResponseEntity.ok(ApiResponse.<List<ExamAnalyticsDTO>>builder()
                .success(true)
                .message("Exam-wise analytics fetched successfully")
                .data(analyticsService.getExamAnalytics(classId, subjectId))
                .build());
    }

    @GetMapping("/students/top")
    public ResponseEntity<ApiResponse<List<StudentRiskBandDTO>>> getTopStudents(
            @RequestParam(defaultValue = "10") int count) {
        return ResponseEntity.ok(ApiResponse.<List<StudentRiskBandDTO>>builder()
                .success(true)
                .message("Top students fetched successfully")
                .data(analyticsService.getTopStudentsInstitutionWide(count))
                .build());
    }

    @GetMapping("/students/weak")
    public ResponseEntity<ApiResponse<List<StudentRiskBandDTO>>> getWeakStudents(
            @RequestParam(defaultValue = "40") double threshold) {
        return ResponseEntity.ok(ApiResponse.<List<StudentRiskBandDTO>>builder()
                .success(true)
                .message("Weak students fetched successfully")
                .data(analyticsService.getWeakStudentsInstitutionWide(threshold))
                .build());
    }

    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<List<TrendPointDTO>>> getPerformanceTrends(
            @RequestParam(required = false) Long classId,
            @RequestParam(required = false) Long subjectId) {
        return ResponseEntity.ok(ApiResponse.<List<TrendPointDTO>>builder()
                .success(true)
                .message("Performance trends fetched successfully")
                .data(analyticsService.getPerformanceTrends(classId, subjectId))
                .build());
    }

    @GetMapping("/comparative")
    public ResponseEntity<ApiResponse<List<ComparativeAnalyticsDTO>>> getComparativeAnalytics(
            @RequestParam String compareType,
            @RequestParam String leftKey,
            @RequestParam String rightKey) {
        return ResponseEntity.ok(ApiResponse.<List<ComparativeAnalyticsDTO>>builder()
                .success(true)
                .message("Comparative analytics fetched successfully")
                .data(analyticsService.getComparativeAnalytics(compareType, leftKey, rightKey))
                .build());
    }

    @GetMapping("/reports/generate")
    public ResponseEntity<ApiResponse<ReportFileDTO>> generateReport(
            @RequestParam String reportType,
            @RequestParam(defaultValue = "PDF") String format) {
        return ResponseEntity.ok(ApiResponse.<ReportFileDTO>builder()
                .success(true)
                .message("Report generated successfully")
                .data(analyticsService.generateAdminReport(reportType, format))
                .build());
    }

    @GetMapping("/advanced/predict-failures")
    public ResponseEntity<ApiResponse<List<PredictionDTO>>> predictFailures() {
        return ResponseEntity.ok(ApiResponse.<List<PredictionDTO>>builder()
                .success(true)
                .message("Failure prediction analytics fetched successfully")
                .data(analyticsService.predictLikelyFailures())
                .build());
    }

    @GetMapping("/advanced/performance-index")
    public ResponseEntity<ApiResponse<List<PerformanceIndexDTO>>> getPerformanceIndex() {
        return ResponseEntity.ok(ApiResponse.<List<PerformanceIndexDTO>>builder()
                .success(true)
                .message("Performance index fetched successfully")
                .data(analyticsService.getPerformanceIndex())
                .build());
    }

    @GetMapping("/advanced/gap-analysis")
    public ResponseEntity<ApiResponse<List<GapAnalysisDTO>>> getGapAnalysis() {
        return ResponseEntity.ok(ApiResponse.<List<GapAnalysisDTO>>builder()
                .success(true)
                .message("Gap analysis fetched successfully")
                .data(analyticsService.getGapAnalysis())
                .build());
    }


    @GetMapping("/advanced/improvement-tracking")
    public ResponseEntity<ApiResponse<List<ImprovementTrackingDTO>>> getImprovementTracking() {
        return ResponseEntity.ok(ApiResponse.<List<ImprovementTrackingDTO>>builder()
                .success(true)
                .message("Improvement tracking fetched successfully")
                .data(analyticsService.getImprovementTracking())
                .build());
    }

    //asssessment type ~ percentage (institute)
    @GetMapping("/assessment-types/average-percentage")
    public ResponseEntity<ApiResponse<List<AssessmentTypeAverageDTO>>> getAssessmentTypeAveragePercentage() {
        return ResponseEntity.ok(ApiResponse.<List<AssessmentTypeAverageDTO>>builder()
                .success(true)
                .message("Assessment type average percentage fetched successfully")
                .data(analyticsService.getAssessmentTypeAveragePercentage())
                .build());
    }

    //institute grade distribution
    @GetMapping("/institute/grade-distribution")
    public ResponseEntity<ApiResponse<List<GradeDistributionDTO>>> getInstituteGradeDistribution() {
        return ResponseEntity.ok(ApiResponse.<List<GradeDistributionDTO>>builder()
                .success(true)
                .message("Institute grade distribution fetched successfully")
                .data(analyticsService.getInstituteGradeDistribution())
                .build());
    }
}
