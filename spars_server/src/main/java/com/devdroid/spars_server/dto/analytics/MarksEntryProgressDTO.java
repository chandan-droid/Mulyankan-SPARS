package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarksEntryProgressDTO {
    private String assessmentType;
    private long recordedAssessments;
    private long totalAssessments;
    private double progressPercentage;
}

