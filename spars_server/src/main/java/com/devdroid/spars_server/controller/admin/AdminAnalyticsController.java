package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.analytics.CoAttainmentComparisonDTO;
import com.devdroid.spars_server.dto.analytics.PerformanceDistributionDTO;
import com.devdroid.spars_server.dto.analytics.StudentPerformanceDTO;
import com.devdroid.spars_server.service.AnalyticsService;
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
}
