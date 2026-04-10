package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceDistributionDTO {
    private String range; // e.g., "0-10%", "10-20%"
    private Long studentCount;
}
