package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentRiskBandDTO {
    private Long studentId;
    private String studentName;
    private Double overallPercentage;
    private String band;
}
