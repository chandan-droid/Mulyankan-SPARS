package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImprovementTrackingDTO {
    private Long studentId;
    private String studentName;
    private Double previousAverage;
    private Double currentAverage;
    private Double delta;
}
