package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentPerformanceDTO {
    private Long studentId;
    private String studentName;
    private Double overallPercentage;
}
