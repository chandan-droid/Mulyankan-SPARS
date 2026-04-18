package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComparativeAnalyticsDTO {
    private String metric;
    private String leftLabel;
    private Double leftValue;
    private String rightLabel;
    private Double rightValue;
    private Double delta;
}
