package com.devdroid.spars_server.dto.analytics;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarksEntryProgressSummaryDTO {
    private double averageProgressPercentage;
    private List<MarksEntryProgressDTO> progressByAssessmentType;
}

