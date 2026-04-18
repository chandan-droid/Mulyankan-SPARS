package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExamAnalyticsDTO {
    private Long assessmentId;
    private String assessmentName;
    private String examType;
    private Double averageMarks;
    private Double passPercentage;
    private Double deltaFromPrevious;
}
