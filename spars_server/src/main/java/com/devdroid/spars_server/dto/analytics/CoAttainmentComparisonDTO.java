package com.devdroid.spars_server.dto.analytics;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoAttainmentComparisonDTO {
    private Long assessmentId;
    private String assessmentName;
    private List<com.devdroid.spars_server.dto.CoAttainmentDTO> coAttainments;
}
